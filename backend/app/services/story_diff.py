"""Multi-source diff for a Story."""

import re
from collections import Counter
from typing import Optional

from .. import models, schemas
from .story_engine import _normalize_title


def _tokenize(text: Optional[str]) -> list[str]:
    if not text:
        return []
    normalized = _normalize_title(text)
    return [t for t in normalized.split() if len(t) > 1]


def generate_story_diff(story: models.Story) -> schemas.StoryDiffRead:
    """Build a multi-source diff view for a story.

    Returns the articles grouped by source, plus simple common/unique word stats.
    """
    articles = []
    source_names = set()
    all_tokens = []

    for link in sorted(story.article_links, key=lambda x: x.article_id):
        article = link.article
        if not article:
            continue
        source_name = article.source.name if article.source else "unknown"
        source_names.add(source_name)
        articles.append(
            schemas.StoryDiffItem(
                source_name=source_name,
                article_id=article.id,
                title=article.title or "",
                summary=article.summary_raw,
                published_at=article.published_at,
                url=article.canonical_url or article.url,
            )
        )
        all_tokens.extend(_tokenize(article.title))
        all_tokens.extend(_tokenize(article.summary_raw))

    counter = Counter(all_tokens)
    # Common words appear in at least half of the articles and more than once.
    min_occurrences = max(2, len(articles) // 2)
    common_words = [word for word, count in counter.most_common(10) if count >= min_occurrences]

    # Unique phrases are tokens that appear only once across all article texts.
    unique_phrases = [word for word, count in counter.most_common(20) if count == 1]

    return schemas.StoryDiffRead(
        story_id=story.id,
        canonical_title=story.canonical_title,
        sources=sorted(source_names),
        articles=articles,
        common_words=common_words,
        unique_phrases=unique_phrases,
    )
