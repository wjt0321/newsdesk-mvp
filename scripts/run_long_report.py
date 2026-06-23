#!/usr/bin/env python3
"""Generate a long-running report for NewsDesk MVP.

Queries the local SQLite database directly and writes a Markdown report to
`reports/<timestamp>-long-report.md`. Run from the project root with the
backend virtual environment:

    cd newsdesk-mvp
    backend/.venv/Scripts/python scripts/run_long_report.py --duration 24h

Supported durations: 24h, 7d.
"""

import argparse
import os
import sys
from datetime import timedelta
from pathlib import Path

# Make `backend/app` importable and ensure relative DB path resolves to backend/data.
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models
from app.database import SessionLocal, init_db
from app.utils.time import ensure_utc, utc_now


DURATION_MAP = {
    "24h": timedelta(hours=24),
    "7d": timedelta(days=7),
}


def parse_duration(value: str) -> timedelta:
    if value not in DURATION_MAP:
        raise argparse.ArgumentTypeError(f"duration must be one of {list(DURATION_MAP)}")
    return DURATION_MAP[value]


def _fmt_dt(dt):
    if dt is None:
        return "N/A"
    return dt.strftime("%Y-%m-%d %H:%M:%S UTC")


def generate_report(db: Session, duration: timedelta, duration_label: str) -> str:
    now = utc_now()
    since = now - duration

    total_sources = db.query(models.Source).count()
    enabled_sources = db.query(models.Source).filter(models.Source.enabled == True).count()  # noqa: E712

    # Source health stats (mirrors /api/source-health logic).
    broken_threshold = 7
    silent_hours = 48

    healthy = 0
    degraded = 0
    broken = 0
    silent = 0
    noisy = 0
    disabled = 0

    noisy_articles_threshold = 100
    noisy_stories_threshold = 10

    source_rows = []
    for source in db.query(models.Source).order_by(models.Source.created_at.desc()).all():
        if not source.enabled:
            disabled += 1
            status = "disabled"
        elif source.error_count >= broken_threshold:
            broken += 1
            status = "broken"
        elif source.last_success_at is None:
            if source.error_count > 0:
                broken += 1
                status = "broken"
            else:
                degraded += 1
                status = "degraded"
        else:
            last_success = ensure_utc(source.last_success_at)
            hours = (now - last_success).total_seconds() / 3600
            if hours > silent_hours:
                silent += 1
                status = "silent"
            elif 1 <= source.error_count <= 3:
                degraded += 1
                status = "degraded"
            else:
                status = "healthy"
                healthy += 1

        article_count_24h = (
            db.query(func.count(models.Article.id))
            .filter(
                models.Article.source_id == source.id,
                models.Article.fetched_at >= since,
            )
            .scalar()
            or 0
        )
        story_count_24h = (
            db.query(func.count(func.distinct(models.StoryArticleLink.story_id)))
            .join(models.Article, models.Article.id == models.StoryArticleLink.article_id)
            .filter(
                models.Article.source_id == source.id,
                models.Article.fetched_at >= since,
            )
            .scalar()
            or 0
        )

        if status == "healthy" and article_count_24h > noisy_articles_threshold and story_count_24h < noisy_stories_threshold:
            status = "noisy"
            noisy += 1
            healthy -= 1

        source_rows.append(
            {
                "name": source.name,
                "status": status,
                "error_count": source.error_count,
                "last_success": source.last_success_at,
                "article_count": article_count_24h,
                "story_count": story_count_24h,
            }
        )

    # Aggregate article/story stats.
    total_articles = (
        db.query(func.count(models.Article.id))
        .filter(models.Article.fetched_at >= since)
        .scalar()
        or 0
    )
    total_stories = (
        db.query(func.count(models.Story.id))
        .filter(models.Story.first_seen_at >= since)
        .scalar()
        or 0
    )

    # Top sources by article count.
    top_sources = (
        db.query(
            models.Source.name,
            func.count(models.Article.id).label("article_count"),
        )
        .join(models.Article, models.Article.source_id == models.Source.id)
        .filter(models.Article.fetched_at >= since)
        .group_by(models.Source.id)
        .order_by(func.count(models.Article.id).desc())
        .limit(10)
        .all()
    )

    # Top channels by story count.
    top_channels = (
        db.query(
            models.Source.category,
            func.count(func.distinct(models.StoryArticleLink.story_id)).label("story_count"),
        )
        .select_from(models.Source)
        .join(models.Article, models.Article.source_id == models.Source.id)
        .join(models.StoryArticleLink, models.StoryArticleLink.article_id == models.Article.id)
        .filter(models.Article.fetched_at >= since)
        .group_by(models.Source.category)
        .order_by(func.count(func.distinct(models.StoryArticleLink.story_id)).desc())
        .limit(10)
        .all()
    )

    # Category distribution by article count for imbalance detection.
    category_article_counts = (
        db.query(
            models.Source.category,
            func.count(models.Article.id).label("article_count"),
        )
        .join(models.Article, models.Article.source_id == models.Source.id)
        .filter(models.Article.fetched_at >= since)
        .group_by(models.Source.category)
        .order_by(func.count(models.Article.id).desc())
        .all()
    )

    # Success rate.
    success_rate = 0.0
    if enabled_sources > 0:
        success_rate = (healthy + noisy) / enabled_sources * 100

    lines = [
        f"# NewsDesk 长跑报告 ({duration_label})",
        "",
        f"> 生成时间：{_fmt_dt(now)}  ",
        f"> 统计区间：{_fmt_dt(since)} ~ {_fmt_dt(now)}",
        "",
        "## 汇总",
        "",
        f"- 总来源数：{total_sources}",
        f"- 启用来源数：{enabled_sources}",
        f"- 源成功率：{success_rate:.1f}%",
        f"- 新增文章：{total_articles}",
        f"- 新增 Story：{total_stories}",
        "",
        "## 源健康分布",
        "",
        f"- healthy：{healthy}",
        f"- degraded：{degraded}",
        f"- broken：{broken}",
        f"- silent：{silent}",
        f"- noisy：{noisy}",
        f"- disabled：{disabled}",
        "",
        "## 问题源清单",
        "",
        "| 名称 | 状态 | 错误次数 | 最近成功 | 24h 文章 | 24h Story |",
        "|---|---|---|---|---|---|",
    ]

    problem_rows = [r for r in source_rows if r["status"] != "healthy"]
    if problem_rows:
        for row in problem_rows:
            lines.append(
                f"| {row['name']} | {row['status']} | {row['error_count']} | "
                f"{_fmt_dt(row['last_success'])} | {row['article_count']} | {row['story_count']} |"
            )
    else:
        lines.append("| 无 | | | | | |")

    lines.extend(
        [
            "",
            "## Top 来源（按 24h 文章数）",
            "",
            "| 来源 | 文章数 |",
            "|---|---|",
        ]
    )
    if top_sources:
        for name, count in top_sources:
            lines.append(f"| {name} | {count} |")
    else:
        lines.append("| 无 | 0 |")

    lines.extend(
        [
            "",
            "## Top 频道（按 24h Story 数）",
            "",
            "| 频道 | Story 数 |",
            "|---|---|",
        ]
    )
    if top_channels:
        for category, count in top_channels:
            lines.append(f"| {category} | {count} |")
    else:
        lines.append("| 无 | 0 |")

    lines.extend(_generate_conclusions(
        enabled_sources=enabled_sources,
        healthy=healthy,
        noisy=noisy,
        success_rate=success_rate,
        total_articles=total_articles,
        top_sources=top_sources,
        top_channels=top_channels,
        category_article_counts=category_article_counts,
        problem_rows=problem_rows,
    ))

    return "\n".join(lines)


def _generate_conclusions(
    enabled_sources: int,
    healthy: int,
    noisy: int,
    success_rate: float,
    total_articles: int,
    top_sources: list,
    top_channels: list,
    category_article_counts: list,
    problem_rows: list,
) -> list[str]:
    """Generate actionable observational conclusions."""
    conclusions: list[str] = []
    actions: list[str] = []

    # 1. Overall judgment.
    if success_rate >= 95:
        judgment = "健康"
    elif success_rate >= 85:
        judgment = "可接受"
    else:
        judgment = "需处理"
    conclusions.append(
        f"1. 本轮 {enabled_sources} 个启用源中 {healthy + noisy} 个健康，"
        f"源成功率 {success_rate:.1f}%，整体判断为 **{judgment}**。"
    )

    # 2. Problem sources.
    if problem_rows:
        names = [r["name"] for r in problem_rows]
        conclusions.append(f"2. 问题源共 {len(problem_rows)} 个：{', '.join(names)}。")
        for row in problem_rows:
            if row["status"] == "broken":
                actions.append(f"检查并修复或禁用 broken 源 `{row['name']}`（错误次数 {row['error_count']}）。")
            elif row["status"] == "silent":
                actions.append(f" silent 源 `{row['name']}` 超过 48h 无成功抓取，确认 URL 是否仍有效。")
            elif row["status"] == "degraded":
                actions.append(f" degraded 源 `{row['name']}` 偶发失败，观察下一轮是否恢复。")
            elif row["status"] == "noisy":
                actions.append(f" noisy 源 `{row['name']}` 文章多但生成 Story 少，检查是否刷屏或重复内容。")
    else:
        conclusions.append("2. 没有问题源，所有启用源均处于健康状态。")

    # 3. Screen flooding risk.
    if top_sources and total_articles > 0:
        top_name, top_count = top_sources[0]
        top_ratio = top_count / total_articles * 100
        conclusions.append(
            f"3. Top 来源 `{top_name}` 贡献 {top_count} 篇文章，占比 {top_ratio:.1f}%。"
        )
        if top_ratio > 40:
            actions.append(f"`{top_name}` 占比超过 40%，存在刷屏风险，建议降低其抓取频率或在首页降权。")
        elif top_ratio > 25:
            actions.append(f"`{top_name}` 占比超过 25%，建议观察是否影响首页多样性。")

    # 4. Category imbalance.
    if len(category_article_counts) >= 2:
        top_cat, top_cat_count = category_article_counts[0]
        second_cat, second_cat_count = category_article_counts[1]
        if top_cat_count > 0:
            imbalance_ratio = second_cat_count / top_cat_count
            conclusions.append(
                f"4. 文章最多的频道是 `{top_cat}`（{top_cat_count} 篇），"
                f"其次是 `{second_cat}`（{second_cat_count} 篇）。"
            )
            if imbalance_ratio < 0.3:
                actions.append(f"`{top_cat}` 占比明显偏高，建议补充 `{second_cat}` 之外的源或调整权重。")
    elif len(category_article_counts) == 1:
        top_cat, top_cat_count = category_article_counts[0]
        conclusions.append(f"4. 只有一个频道 `{top_cat}` 有数据，来源多样性不足。")
        actions.append("补充不同分类的来源，避免首页信息单一。")

    # 5. Next steps from actions.
    if actions:
        conclusions.append("5. 建议下一步动作：")
        for idx, action in enumerate(actions[:5], 1):
            conclusions.append(f"   {idx}. {action}")
    else:
        conclusions.append("5. 当前无明显问题，建议继续观察并定期复核 Story 质量。")

    # 6. Machine-readable summary block.
    summary_block = {
        "judgment": judgment,
        "enabled_sources": enabled_sources,
        "healthy_sources": healthy + noisy,
        "problem_sources": len(problem_rows),
        "success_rate_pct": round(success_rate, 1),
        "total_articles": total_articles,
        "top_source_ratio_pct": round(top_sources[0][1] / total_articles * 100, 1) if top_sources and total_articles else 0.0,
        "recommended_actions": actions[:5],
    }

    lines = [
        "",
        "## 观察结论",
        "",
    ]
    lines.extend(conclusions)
    lines.extend([
        "",
        "## 机器可读摘要",
        "",
        "```json",
    ])
    import json
    lines.append(json.dumps(summary_block, ensure_ascii=False, indent=2))
    lines.extend([
        "```",
        "",
    ])
    return lines


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate NewsDesk long-running report")
    parser.add_argument(
        "--duration",
        type=parse_duration,
        default=timedelta(hours=24),
        help="Report window: 24h or 7d (default: 24h)",
    )
    args = parser.parse_args()

    duration_label = "24h" if args.duration == timedelta(hours=24) else "7d"

    reports_dir = Path(PROJECT_ROOT) / "reports"
    reports_dir.mkdir(exist_ok=True)

    timestamp = utc_now().strftime("%Y%m%d-%H%M%S")
    output_path = reports_dir / f"{timestamp}-long-report.md"

    init_db()
    db = SessionLocal()
    try:
        report = generate_report(db, args.duration, duration_label)
    finally:
        db.close()

    output_path.write_text(report, encoding="utf-8")
    print(f"Report written to {output_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
