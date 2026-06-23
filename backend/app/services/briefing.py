"""Daily briefing generation."""

from datetime import timedelta
from typing import Optional

from sqlalchemy.orm import Session

from .. import models, schemas
from ..utils.time import naive_utc_now
from .ai_providers.base import SummaryResult
from .ai_summary import _count_today_calls, _get_provider
from .story_engine import compute_heat_score


def _story_to_briefing_item(story: models.Story, rank: int) -> dict:
    return {
        "rank": rank,
        "story_id": story.id,
        "title": story.short_title or story.canonical_title,
        "status": story.status,
        "heat_score": story.heat_score,
        "source_count": story.source_count,
        "article_count": story.article_count,
        "top_source": next(
            (link.article.source.name for link in story.article_links if link.article and link.article.source),
            None,
        ),
    }


def _select_top_stories(db: Session, limit: int = 10) -> list[models.Story]:
    since = naive_utc_now() - timedelta(hours=24)
    stories = (
        db.query(models.Story)
        .filter(models.Story.last_updated_at >= since)
        .filter(models.Story.needs_review == False)
        .filter(models.Story.confidence >= 0.7)
        .all()
    )
    # Recompute heat to get stable dynamic ordering.
    scored = [(story, compute_heat_score(story)) for story in stories]
    scored.sort(key=lambda x: x[1], reverse=True)
    return [story for story, _ in scored[:limit]]


def _build_plain_text_briefing(items: list[dict], generated_at: str) -> str:
    lines = [f"NewsDesk 今日简报 ({generated_at})", "=" * 30, ""]
    for item in items:
        lines.append(f"{item['rank']}. {item['title']}")
        lines.append(f"   状态: {item['status']} | 热度: {item['heat_score']:.1f} | 来源: {item['source_count']}")
        lines.append("")
    return "\n".join(lines)


def _build_ai_prompt(items: list[dict]) -> str:
    lines = [
        "Write a concise Chinese daily news briefing based on the following top stories.",
        "Output strictly as JSON with keys: title (string), intro (string), items (list of {rank, title, highlight}).",
        "",
        "Stories:",
    ]
    for item in items:
        lines.append(f"{item['rank']}. {item['title']} (status={item['status']}, heat={item['heat_score']:.1f})")
    return "\n".join(lines)


def generate_briefing(db: Session) -> schemas.BriefingRead:
    """Generate a daily briefing from the top stories of the last 24 hours.

    If AI is enabled and the daily limit allows, use the configured provider to
    generate a polished intro and highlights. Otherwise fall back to a plain
    text summary.
    """
    from ..utils.time import utc_now

    top_stories = _select_top_stories(db)
    items = [_story_to_briefing_item(story, idx + 1) for idx, story in enumerate(top_stories)]
    generated_at = utc_now()

    ai_title: Optional[str] = None
    ai_intro: Optional[str] = None
    ai_items: Optional[list[dict]] = None
    model: Optional[str] = None

    provider = _get_provider()
    if provider is not None and _count_today_calls(db) < 1:
        prompt = _build_ai_prompt(items)
        try:
            response = provider.summarize(
                canonical_title="Daily Briefing",
                short_title="今日简报",
                article_titles=[item["title"] for item in items],
                article_summaries=[],
            )
            if response is not None:
                # Reuse the structured output from the provider.
                ai_title = getattr(response, "summary", None) or "今日简报"
                ai_intro = " ".join(getattr(response, "key_points", []))
                ai_items = [
                    {"rank": item["rank"], "title": item["title"], "highlight": ""}
                    for item in items
                ]
                model = response.model
        except Exception:
            pass

    plain_text = _build_plain_text_briefing(items, generated_at.strftime("%Y-%m-%d %H:%M UTC"))

    return schemas.BriefingRead(
        generated_at=generated_at,
        items=items,
        plain_text=plain_text,
        ai_title=ai_title,
        ai_intro=ai_intro,
        ai_items=ai_items,
        model=model,
    )
