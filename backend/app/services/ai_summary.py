import hashlib
import json
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from .. import models
from ..config import settings
from .ai_providers import OpenAICompatibleProvider, PlaceholderProvider
from .ai_providers.base import AIProvider


def _get_provider() -> Optional[AIProvider]:
    """Select provider based on configuration.

    Priority:
    1. If AI is disabled, return None (no summary generated).
    2. If provider is explicitly "placeholder", use placeholder.
    3. If a supported real provider is configured and has an API key, use it.
    4. Otherwise fall back to placeholder.
    """
    if not settings.ai_enabled:
        return None

    if settings.ai_provider == "placeholder":
        return PlaceholderProvider()

    if settings.ai_provider in {"openai", "deepseek", "doubao"}:
        provider = OpenAICompatibleProvider()
        if provider.available():
            return provider

    return PlaceholderProvider()


def _fingerprint(story: models.Story) -> str:
    """Hash of the story content used to decide whether a cached summary is stale."""
    parts = [
        story.canonical_title or "",
        story.short_title or "",
        story.summary or "",
        str(story.source_count),
        str(story.article_count),
    ]
    for link in sorted(story.article_links, key=lambda x: x.article_id):
        article = link.article
        if article:
            parts.append(article.title or "")
            parts.append(article.summary_raw or "")
    text = "\n".join(parts)
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:32]


def _count_today_calls(db: Session) -> int:
    since = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    return (
        db.query(models.StoryAISummary)
        .filter(models.StoryAISummary.generated_at >= since)
        .count()
    )


def _extract_article_data(story: models.Story) -> tuple[list[str], list[str]]:
    titles = []
    summaries = []
    for link in sorted(story.article_links, key=lambda x: x.article_id):
        article = link.article
        if not article:
            continue
        titles.append(article.title or "")
        summaries.append(article.summary_raw or "")
    return titles, summaries


def get_cached_summary(
    db: Session, story: models.Story
) -> Optional[models.StoryAISummary]:
    """Return a cached summary if the source fingerprint matches."""
    fp = _fingerprint(story)
    return (
        db.query(models.StoryAISummary)
        .filter(
            models.StoryAISummary.story_id == story.id,
            models.StoryAISummary.source_fingerprint == fp,
            models.StoryAISummary.status == "success",
        )
        .order_by(models.StoryAISummary.generated_at.desc())
        .first()
    )


def generate_summary(
    db: Session, story: models.Story
) -> Optional[models.StoryAISummary]:
    """Generate or return a cached AI summary for a story.

    Returns None if the daily limit is reached or generation fails.
    When AI is disabled or unconfigured, the placeholder provider is used.
    """
    if _count_today_calls(db) >= settings.ai_daily_limit:
        return None

    cached = get_cached_summary(db, story)
    if cached:
        return cached

    provider = _get_provider()
    if provider is None:
        return None

    titles, summaries = _extract_article_data(story)

    result = provider.summarize(
        canonical_title=story.canonical_title,
        short_title=story.short_title,
        article_titles=titles,
        article_summaries=summaries,
    )

    if result is None:
        # Real provider failed; do not cache failures.
        return None

    record = models.StoryAISummary(
        story_id=story.id,
        model=result.model,
        summary=result.summary,
        key_points_json=json.dumps(result.key_points, ensure_ascii=False),
        differences_json=json.dumps(result.differences, ensure_ascii=False),
        source_fingerprint=_fingerprint(story),
        token_cost=result.token_cost,
        status="success",
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
