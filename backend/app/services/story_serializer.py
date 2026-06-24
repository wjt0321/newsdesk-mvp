from datetime import datetime, timezone
from typing import List

from .. import models, schemas
from . import content_cleaner
from .story_engine import compute_heat_score, story_status


def _clean_article(article: models.Article) -> schemas.ArticleRead:
    read = schemas.ArticleRead.model_validate(article)
    read.clean_title = content_cleaner.clean_title(article.title)
    read.clean_summary = content_cleaner.clean_summary(article.summary_raw)
    read.clean_content_text = content_cleaner.clean_content_text(article.content_text)
    return read


def story_to_read(story: models.Story) -> schemas.StoryRead:
    article_links = story.article_links
    article_ids = [link.article_id for link in article_links]
    articles = [_clean_article(link.article) for link in article_links if link.article]
    source_names = sorted({link.article.source.name for link in article_links if link.article and link.article.source})
    return schemas.StoryRead(
        id=story.id,
        canonical_title=story.canonical_title,
        short_title=story.short_title,
        clean_title=content_cleaner.clean_title(story.short_title or story.canonical_title),
        clean_summary=content_cleaner.clean_summary(story.summary),
        first_seen_at=story.first_seen_at,
        last_updated_at=story.last_updated_at,
        source_count=story.source_count,
        article_count=story.article_count,
        heat_score=compute_heat_score(story),
        confidence=story.confidence or 0.0,
        merge_reason=story.merge_reason,
        needs_review=story.needs_review or False,
        status=story_status(story),
        article_ids=article_ids,
        source_names=source_names,
        articles=articles,
    )


def stories_to_read(stories: List[models.Story]) -> List[schemas.StoryRead]:
    return [story_to_read(s) for s in stories]
