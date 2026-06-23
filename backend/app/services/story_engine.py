import hashlib
import re
import unicodedata
from datetime import timedelta
from typing import Optional

import rapidfuzz
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models
from ..utils.time import ensure_utc, naive_utc_now, utc_now


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:32]


# Common Chinese and English stop words for title comparison.
_STOP_WORDS = {
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "must", "shall", "can", "need", "dare",
    "of", "in", "on", "at", "to", "for", "with", "about", "against",
    "between", "into", "through", "during", "before", "after", "above",
    "below", "from", "up", "down", "out", "off", "over", "under", "again",
    "further", "then", "once", "here", "there", "when", "where", "why",
    "how", "all", "each", "few", "more", "most", "other", "some", "such",
    "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very",
    "的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "都", "一",
    "一个", "上", "也", "很", "到", "说", "要", "去", "你", "会", "着", "没有",
    "看", "好", "自己", "这", "那",
}


def _to_halfwidth(text: str) -> str:
    """Convert full-width ASCII characters to half-width."""
    return "".join(
        unicodedata.normalize("NFKC", ch) if 0xFF01 <= ord(ch) <= 0xFF5E else ch
        for ch in text
    )


def _normalize_title(title: str) -> str:
    """Normalize a title for similarity comparison.

    Steps:
    - Strip site/publisher suffixes (e.g. "| 36氪", "- 知乎").
    - Remove bracketed/parenthesized noise.
    - Convert full-width characters to half-width.
    - Split into CJK characters and ASCII words.
    - Lowercase English.
    - Remove common stop words.
    """
    if not title:
        return ""

    text = title.strip()
    text = _to_halfwidth(text)

    # Remove common site suffixes.
    text = re.sub(r"[\|\-–—]\s*[^\|\-–—]*?(?:氪|虎嗅|钛媒体|品玩|知乎|澎湃|界面|新浪|网易|腾讯|搜狐|头条)$", "", text)
    text = re.sub(r"[\|\-–—]\s*\w+\s*(?:\.com|\.cn|\.net|\.org)$", "", text, flags=re.IGNORECASE)

    # Remove content inside brackets/parentheses.
    text = re.sub(r"[\(\[\{【（<].*?[\)\]\}】）>]", "", text)

    # Remove punctuation, keep CJK chars and ASCII alphanumerics.
    text = re.sub(r"[^\w\u4e00-\u9fff]", " ", text)

    # Split into tokens: each CJK character is its own token, ASCII runs stay together.
    tokens = []
    for raw in text.split():
        # Separate CJK characters from ASCII/alphanumeric runs.
        parts = re.findall(r"[\u4e00-\u9fff]|[a-zA-Z0-9]+", raw)
        for part in parts:
            token = part.lower()
            if token in _STOP_WORDS or len(token) < 1:
                continue
            tokens.append(token)

    return " ".join(tokens)


# Simple entity dictionary for MVP+. Long-term this can be replaced by NER.
_ENTITY_PATTERNS = {
    "stock_code": re.compile(r"\b\d{6}\.[A-Z]{2}\b|\b[A-Z]{1,5}\b"),
}
_ENTITY_KEYWORDS = {
    "openai", "deepseek", "anthropic", "google", "microsoft", "apple", "amazon",
    "meta", "tesla", "nvidia", "intel", "amd", "qualcomm", "tsmc", "samsung",
    "alibaba", "tencent", "baidu", "bytedance", "xiaomi", "huawei", "meituan",
    "jd", "pinduoduo", "kuaishou", "didi", "xiaohongshu", "bilibili",
    "中国", "美国", "欧盟", "日本", "韩国", "印度", "俄罗斯",
    "ai", "gpt", "llm", "大模型", "人工智能", "芯片", "半导体",
    # Chinese names of common entities for cross-language matching.
    "英伟达", "特斯拉", "谷歌", "微软", "苹果", "亚马逊", "脸书",
}

# Bilingual keyword groups for lightweight cross-language clustering.
# All members of a group map to the same canonical entity key.
_CROSS_LANG_GROUPS = [
    {"ai", "人工智能"},
    {"nvidia", "英伟达"},
    {"tesla", "特斯拉"},
    {"google", "谷歌"},
    {"microsoft", "微软"},
    {"apple", "苹果"},
    {"amazon", "亚马逊"},
    {"meta", "脸书", "facebook"},
    {"llm", "大模型"},
    {"chip", "芯片"},
    {"semiconductor", "半导体"},
]
_CROSS_LANG_CANONICAL = {}
for group in _CROSS_LANG_GROUPS:
    # Prefer ASCII/English as the canonical key for predictable output.
    ascii_members = [m for m in group if m.isascii()]
    canonical = min(ascii_members, key=len) if ascii_members else min(group, key=len)
    for member in group:
        _CROSS_LANG_CANONICAL[member] = canonical


def _extract_entities(text: str) -> set[str]:
    """Extract a small set of high-signal entities from text.

    Bilingual synonyms are normalized to a shared canonical key so that
    Chinese and English headlines about the same topic can still overlap.
    """
    if not text:
        return set()

    entities = set()
    # Stock codes / ticker symbols.
    for match in _ENTITY_PATTERNS["stock_code"].finditer(text):
        entities.add(match.group().upper())

    # Keyword dictionary with cross-language canonicalization.
    lower = text.lower()
    for keyword in _ENTITY_KEYWORDS:
        if keyword in lower:
            entities.add(_CROSS_LANG_CANONICAL.get(keyword, keyword))

    return entities


def _entity_overlap_score(entities_a: set[str], entities_b: set[str]) -> float:
    """Return 0-1 overlap score between two entity sets."""
    if not entities_a or not entities_b:
        return 0.0
    intersection = entities_a & entities_b
    union = entities_a | entities_b
    return len(intersection) / len(union) if union else 0.0


def _title_similarity(a: str, b: str) -> float:
    """Return rapidfuzz ratio (0-100)."""
    if not a or not b:
        return 0.0
    return rapidfuzz.fuzz.ratio(a, b)


def compute_heat_score(story: models.Story) -> float:
    """Compute heat based on source_count, article_count, and recency."""
    now = utc_now()
    age = now - ensure_utc(story.last_updated_at)
    recency_bonus = 0
    if age <= timedelta(hours=1):
        recency_bonus = 20
    elif age <= timedelta(hours=6):
        recency_bonus = 10
    elif age <= timedelta(hours=24):
        recency_bonus = 5
    return story.source_count * 10 + story.article_count * 2 + recency_bonus


def story_status(story: models.Story) -> str:
    """breaking (<30min), hot (heat_score >= 50), new (<2h), developing (<24h), stable otherwise."""
    now = utc_now()
    age = now - ensure_utc(story.first_seen_at)
    if age < timedelta(minutes=30):
        return "breaking"
    if story.heat_score >= 50:
        return "hot"
    if age < timedelta(hours=2):
        return "new"
    if age < timedelta(hours=24):
        return "developing"
    return "stable"


def _recompute_story(
    db: Session,
    story: models.Story,
    merge_reason: Optional[str] = None,
    confidence: Optional[float] = None,
) -> None:
    """Refresh aggregate counters and derived fields for a story."""
    links = db.query(models.StoryArticleLink).filter_by(story_id=story.id).all()
    story.article_count = len(links)
    story.source_count = (
        db.query(func.count(func.distinct(models.Article.source_id)))
        .join(models.StoryArticleLink)
        .filter(models.StoryArticleLink.story_id == story.id)
        .scalar()
        or 0
    )
    story.last_updated_at = utc_now()
    story.heat_score = compute_heat_score(story)
    story.status = story_status(story)

    if merge_reason is not None:
        story.merge_reason = merge_reason
    if confidence is not None:
        story.confidence = confidence
        story.needs_review = confidence < 0.7


def _find_story_for_article(
    db: Session, article: models.Article
) -> tuple[Optional[models.Story], Optional[str], float]:
    """Try exact/normalized title or canonical_url match first, then similarity.

    Returns (story, merge_reason, confidence). merge_reason is one of:
    url, title_hash, similarity, or None if no match.
    """
    if not article.title:
        return None, None, 0.0

    now = naive_utc_now()
    window = timedelta(hours=48)
    since = now - window

    # Hard dedup: exact canonical_url or hash_url match across any article.
    link = (
        db.query(models.StoryArticleLink)
        .join(models.Article)
        .filter(
            (models.Article.canonical_url == article.canonical_url)
            | (models.Article.hash_url == article.hash_url)
        )
        .first()
    )
    if link:
        return link.story, "url", 1.0

    # Hard dedup: hash_title match within 48h.
    # Use fetched_at as fallback for articles whose feed did not provide a date.
    incoming_hash_title = _hash(_normalize_title(article.title))
    link = (
        db.query(models.StoryArticleLink)
        .join(models.Article)
        .filter(
            models.Article.hash_title == incoming_hash_title,
            func.coalesce(models.Article.published_at, models.Article.fetched_at) >= since,
        )
        .first()
    )
    if link:
        return link.story, "title_hash", 1.0

    # Similarity + entity clustering against recent stories.
    candidates = (
        db.query(models.Story)
        .filter(models.Story.last_updated_at >= since)
        .all()
    )
    best_story = None
    best_score = 0.0
    norm_title = _normalize_title(article.title)
    article_entities = _extract_entities(article.title)

    for story in candidates:
        story_norm = _normalize_title(story.canonical_title)
        title_score = _title_similarity(norm_title, story_norm)

        # High title similarity is enough on its own.
        if title_score >= 85 and title_score > best_score:
            best_score = title_score
            best_story = story
            continue

        # Medium title similarity + strong entity overlap can also merge.
        if title_score >= 60:
            story_entities = _extract_entities(story.canonical_title)
            overlap = _entity_overlap_score(article_entities, story_entities)
            combined = title_score * 0.6 + overlap * 100 * 0.4
            if combined >= 70 and combined > best_score:
                best_score = combined
                best_story = story

    if best_story:
        return best_story, "similarity", best_score / 100.0

    return None, None, 0.0


def _link_type_for_matched_story(
    db: Session,
    story: models.Story,
    article: models.Article,
) -> tuple[str, Optional[float], str]:
    """Return (relation, similarity_score, linked_by) for an article matched to an existing story."""
    # If the article shares a canonical_url or hash_url with an article already in
    # the story, treat it as a duplicate (rule-based hard dedup).
    hard_match = (
        db.query(models.Article)
        .join(models.StoryArticleLink)
        .filter(
            models.StoryArticleLink.story_id == story.id,
            models.Article.id != article.id,
        )
        .filter(
            (models.Article.canonical_url == article.canonical_url)
            | (models.Article.hash_url == article.hash_url)
        )
        .first()
    )
    if hard_match:
        return "duplicate", None, "rule"

    # If it matched by hash_title, it is also a duplicate.
    incoming_hash_title = _hash(_normalize_title(article.title))
    hash_match = (
        db.query(models.Article)
        .join(models.StoryArticleLink)
        .filter(
            models.StoryArticleLink.story_id == story.id,
            models.Article.id != article.id,
            models.Article.hash_title == incoming_hash_title,
        )
        .first()
    )
    if hash_match:
        return "duplicate", None, "rule"

    # Otherwise it was matched by title similarity.
    sim = _title_similarity(
        _normalize_title(article.title),
        _normalize_title(story.canonical_title),
    )
    return "update", sim, "rule"


def split_article_from_story(
    db: Session, story: models.Story, article: models.Article
) -> models.Story:
    """Remove an article from its current story and place it into a new story."""
    link = (
        db.query(models.StoryArticleLink)
        .filter_by(story_id=story.id, article_id=article.id)
        .first()
    )
    if not link:
        raise ValueError("Article is not linked to the given story")

    db.delete(link)
    db.flush()

    new_story = models.Story(
        canonical_title=article.title,
        short_title=(article.title[:80] if article.title else None),
        first_seen_at=article.published_at or utc_now(),
        last_updated_at=article.published_at or utc_now(),
        merge_reason="manual_split",
        confidence=1.0,
    )
    db.add(new_story)
    db.flush()

    db.add(
        models.StoryArticleLink(
            story_id=new_story.id,
            article_id=article.id,
            relation="primary",
            linked_by="manual",
        )
    )
    db.flush()

    _recompute_story(db, story)
    _recompute_story(db, new_story)
    db.add(story)
    db.add(new_story)
    db.flush()

    return new_story


def merge_stories(
    db: Session, source_story: models.Story, target_story: models.Story
) -> models.Story:
    """Move all articles from source_story into target_story and delete source_story."""
    if source_story.id == target_story.id:
        raise ValueError("Cannot merge a story into itself")

    links = db.query(models.StoryArticleLink).filter_by(story_id=source_story.id).all()
    for link in links:
        existing = (
            db.query(models.StoryArticleLink)
            .filter_by(story_id=target_story.id, article_id=link.article_id)
            .first()
        )
        if existing:
            db.delete(link)
        else:
            link.story_id = target_story.id
            link.relation = "merged"
            link.linked_by = "manual"
    db.flush()

    db.delete(source_story)
    db.flush()

    target_story.merge_reason = "manual_merge"
    target_story.confidence = 1.0
    _recompute_story(db, target_story)
    db.add(target_story)
    db.flush()

    return target_story


def assign_article_to_story(
    db: Session, article: models.Article
) -> tuple[Optional[models.Story], str]:
    """Find or create a story for the article and return (story, relation).

    relation is one of: primary, update, duplicate, ignored.
    For hard duplicates no link is created so callers can discard the article.
    """
    if not article.title:
        return None, "ignored"

    now = utc_now()

    existing_link = (
        db.query(models.StoryArticleLink)
        .filter_by(article_id=article.id)
        .first()
    )
    if existing_link:
        return existing_link.story, existing_link.relation

    story, merge_reason, confidence = _find_story_for_article(db, article)
    relation = "primary"
    similarity_score = None
    linked_by = "rule"

    if story:
        relation, similarity_score, linked_by = _link_type_for_matched_story(db, story, article)
    else:
        story = models.Story(
            canonical_title=article.title,
            short_title=(article.title[:80] if article.title else None),
            first_seen_at=article.published_at or now,
            last_updated_at=article.published_at or now,
            merge_reason="primary",
            confidence=1.0,
        )
        db.add(story)
        db.flush()

    link = models.StoryArticleLink(
        story_id=story.id,
        article_id=article.id,
        relation=relation,
        similarity_score=similarity_score,
        linked_by=linked_by,
    )
    db.add(link)
    db.flush()

    _recompute_story(
        db,
        story,
        merge_reason=merge_reason,
        confidence=confidence if confidence > 0 else None,
    )
    db.add(story)
    db.flush()

    return story, relation
