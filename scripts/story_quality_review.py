#!/usr/bin/env python3
"""Sample stories and generate a human-reviewable quality report.

Flags potential clustering issues based on heuristics:
- stories marked needs_review
- single-source stories with multiple articles (possible missed merge)
- very low confidence similarity merges
- stories with high title variance across articles
- single-article stories (low confidence unverified)

Run from the project root with the backend virtual environment:

    cd newsdesk-mvp
    backend/.venv/Scripts/python scripts/story_quality_review.py --sample 50

The generated report is a starting point for human review, not an automatic
accuracy conclusion. Each sampled story includes a `manual_label` placeholder
for reviewers to mark ok / false_merge / missed_merge / unclear.
"""

import os
import sys
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

import argparse

from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models
from app.database import init_db, SessionLocal
from app.services.story_engine import _normalize_title, _title_similarity


MANUAL_LABEL_OPTIONS = ["ok", "false_merge", "missed_merge", "unclear", "not_reviewed"]


def _flag_story(story: models.Story) -> list[str]:
    flags = []
    if story.needs_review:
        flags.append("needs_review")
    if story.source_count == 1 and story.article_count >= 2:
        flags.append("single_source_multi_articles")
    if story.merge_reason == "similarity" and story.confidence < 0.75:
        flags.append("low_confidence_similarity")
    if story.source_count == 1 and story.article_count == 1:
        flags.append("single_article_unverified")

    titles = [a.article.title for a in story.article_links if a.article and a.article.title]
    if len(titles) >= 2:
        norms = [_normalize_title(t) for t in titles]
        scores = []
        for i in range(len(norms)):
            for j in range(i + 1, len(norms)):
                scores.append(_title_similarity(norms[i], norms[j]))
        if scores and min(scores) < 50:
            flags.append("high_title_variance")

    return flags


def _story_sort_key(story: models.Story) -> tuple:
    """Return a sort key that pushes higher-priority flags to the top."""
    flags = _flag_story(story)
    if not flags:
        return (3, -story.id)
    # Higher priority for clustering quality flags.
    high = {"needs_review", "high_title_variance", "low_confidence_similarity"}
    medium = {"single_source_multi_articles"}
    if high & set(flags):
        return (0, -story.id)
    if medium & set(flags):
        return (1, -story.id)
    return (2, -story.id)


def generate_report(
    db: Session,
    sample_size: int = 50,
    flagged_first: bool = True,
) -> tuple[str, dict]:
    total = db.query(models.Story).count()
    sample = (
        db.query(models.Story)
        .order_by(func.random())
        .limit(sample_size * 4)
        .all()
    )

    if flagged_first:
        sample = sorted(sample, key=_story_sort_key)
    sample = sample[:sample_size]

    flagged = 0
    needs_review = 0
    flag_counts: dict[str, int] = {}
    for story in sample:
        if story.needs_review:
            needs_review += 1
        flags = _flag_story(story)
        if flags:
            flagged += 1
        for f in flags:
            flag_counts[f] = flag_counts.get(f, 0) + 1

    lines = [
        "# NewsDesk Story 质量抽样评估报告",
        "",
        "> **说明**：本报告基于启发式规则抽样，不是自动准确率结论。`manual_label` 列供人工复核时填写。",
        "",
        f"> 时间：{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}",
        f"> 总体 Story 数：{total}",
        f"> 抽样数：{len(sample)}",
        f"> 标记排序：{'flagged-first' if flagged_first else 'random'}",
        "",
        "## 汇总",
        "",
        f"- 抽样中 needs_review：{needs_review} ({needs_review / len(sample) * 100:.1f}%)",
        f"- 抽样中触发至少一条启发式标记：{flagged} ({flagged / len(sample) * 100:.1f}%)",
        "- 标记分布：",
    ]
    for flag_name, count in sorted(flag_counts.items(), key=lambda x: -x[1]):
        lines.append(f"  - `{flag_name}`：{count}")
    lines.extend([
        "",
        "## 复核速览表",
        "",
        "| # | ID | 标题 | 来源数 | 文章数 | merge_reason | confidence | 标记 | manual_label |",
        "|---|---|---|---|---|---|---|---|---|",
    ])

    for idx, story in enumerate(sample, 1):
        flags = _flag_story(story)
        title = story.canonical_title.replace("|", "\\|")[:60]
        lines.append(
            f"| {idx} | {story.id} | {title} | {story.source_count} | {story.article_count} | "
            f"{story.merge_reason or '-'} | {story.confidence:.2f} | "
            f"{', '.join(flags) if flags else '-'} | not_reviewed |"
        )

    lines.extend([
        "",
        "## 详细抽样",
        "",
        "> 复核时请在每个 Story 的 `manual_label` 行填写：ok / false_merge / missed_merge / unclear",
        "",
    ])

    for idx, story in enumerate(sample, 1):
        flags = _flag_story(story)
        lines.append(f"### {idx}. {story.canonical_title}")
        lines.append("")
        lines.append(f"- ID：{story.id}")
        lines.append(f"- merge_reason：{story.merge_reason}")
        lines.append(f"- confidence：{story.confidence:.2f}")
        lines.append(f"- source_count：{story.source_count}")
        lines.append(f"- article_count：{story.article_count}")
        lines.append(f"- needs_review：{story.needs_review}")
        lines.append(f"- 标记：{', '.join(flags) if flags else 'none'}")
        lines.append(f"- manual_label：not_reviewed")
        lines.append("")
        lines.append("**Articles：**")
        for link in story.article_links:
            article = link.article
            if not article:
                continue
            source_name = article.source.name if article.source else "unknown"
            url = article.canonical_url or article.url or ""
            lines.append(f"- [{source_name}] [{article.title}]({url})")
        lines.append("")

    lines.extend([
        "## 待人工确认的问题清单",
        "",
        "请重点复核以下标记的 Story：",
        "",
        "- [ ] 所有 `needs_review` 项是否确实需要拆分/合并/修正。",
        "- [ ] `single_source_multi_articles` 是否应为 missed_merge。",
        "- [ ] `low_confidence_similarity` 是否为 false_merge。",
        "- [ ] `high_title_variance` 是否标题差异大到不应合并。",
        "- [ ] `single_article_unverified` 是否因单篇来源而暂时无法判断。",
        "",
        "## 观察结论与下一步动作",
        "",
        "_人工复核完成后，根据 manual_label 统计误聚类/漏聚类率，再决定是否需要调整聚类阈值或改进文本规范化。_",
        "",
    ])

    summary = {
        "total_stories": total,
        "sample_size": len(sample),
        "flagged_count": flagged,
        "needs_review_count": needs_review,
        "flagged_first": flagged_first,
    }

    return "\n".join(lines), summary


def main() -> int:
    parser = argparse.ArgumentParser(description="NewsDesk story quality review")
    parser.add_argument(
        "--sample",
        type=int,
        default=50,
        help="Number of stories to sample (default: 50)",
    )
    parser.add_argument(
        "--flagged-first",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Sort flagged stories to the top (default: True)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Output report path (default: reports/<timestamp>-story-quality-review.md)",
    )
    args = parser.parse_args()

    init_db()
    db = SessionLocal()
    try:
        report, summary = generate_report(
            db,
            sample_size=args.sample,
            flagged_first=args.flagged_first,
        )
        if args.output:
            output_path = args.output
        else:
            reports_dir = Path(PROJECT_ROOT) / "reports"
            reports_dir.mkdir(exist_ok=True)
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
            output_path = reports_dir / f"{timestamp}-story-quality-review.md"
        output_path.write_text(report, encoding="utf-8")
        print(f"Report written to {output_path}")
        print(
            f"Summary: {summary['sample_size']} sampled, "
            f"{summary['flagged_count']} flagged, "
            f"{summary['needs_review_count']} needs_review"
        )
    finally:
        db.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
