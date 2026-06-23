from typing import List

from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from .. import models


def _normalize_keywords(rule: models.WatchRule) -> List[str]:
    return [k.strip().lower() for k in rule.keywords.split(",") if k.strip()]


def rule_matches_story(rule: models.WatchRule, story: models.Story) -> bool:
    """Python-level precise check (used when caller already has a story)."""
    if not rule.enabled:
        return False
    keywords = _normalize_keywords(rule)
    if not keywords:
        return False
    text = f"{story.canonical_title or ''} {story.short_title or ''}".lower()
    return any(k in text for k in keywords)


def matching_stories_for_rule(
    db: Session, rule: models.WatchRule, limit: int = 100
) -> List[models.Story]:
    """Return up to `limit` stories whose title matches any rule keyword.

    Matching is pushed to the database layer so rare keywords are still found
    even when the table is large. A small Python-level double-check keeps the
    contract consistent with `rule_matches_story`.
    """
    keywords = _normalize_keywords(rule)
    if not keywords:
        return []

    title_filters = []
    for kw in keywords:
        like = f"%{kw}%"
        title_filters.append(func.lower(models.Story.canonical_title).like(like))
        title_filters.append(func.lower(models.Story.short_title).like(like))

    stories = (
        db.query(models.Story)
        .options(
            joinedload(models.Story.article_links)
            .joinedload(models.StoryArticleLink.article)
            .joinedload(models.Article.source)
        )
        .filter(or_(*title_filters))
        .order_by(models.Story.last_updated_at.desc())
        .limit(limit)
        .all()
    )

    # Defensive: ensure the SQL predicate and Python predicate stay consistent.
    return [s for s in stories if rule_matches_story(rule, s)]
