import hashlib
from typing import Any

import feedparser
import httpx
from sqlalchemy.orm import Session

from .. import models
from ..utils.time import utc_now
from .normalizer import normalize_entry
from .story_engine import assign_article_to_story


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:32]


def _normalize_title(title: str) -> str:
    """Lowercase and remove non-alphanumeric characters for comparison."""
    return "".join(ch.lower() for ch in title if ch.isalnum())


def _parse_feed(source: models.Source) -> Any:
    if source.type in ("rss", "rsshub"):
        return feedparser.parse(source.url)
    # API / web 类型先用 HTTP GET 再尝试按 RSS 解析
    response = httpx.get(source.url, timeout=30, follow_redirects=True)
    response.raise_for_status()
    return feedparser.parse(response.text)


def fetch_source(db: Session, source: models.Source) -> models.FetchLog:
    log = models.FetchLog(source_id=source.id, status="running")
    db.add(log)
    source.last_fetched_at = utc_now()
    db.commit()
    db.refresh(log)

    try:
        data = _parse_feed(source)
        fetched_count = 0
        new_count = 0

        for entry in data.entries:
            article_data = normalize_entry(source, entry)
            title = (article_data.get("title") or "").strip()
            canonical = article_data.get("canonical_url") or article_data.get("url")
            if not canonical or not title:
                continue
            url_hash = _hash(canonical)
            exists = db.query(models.Article).filter_by(hash_url=url_hash).first()
            if exists:
                fetched_count += 1
                continue

            article = models.Article(
                **article_data,
                hash_url=url_hash,
                hash_title=_hash(_normalize_title(title)),
                hash_content=_hash(article_data.get("content_text") or article_data.get("summary_raw") or ""),
            )
            db.add(article)
            db.flush()
            story, _relation = assign_article_to_story(db, article)
            fetched_count += 1
            if story is not None:
                new_count += 1

        # commit once at the end of the try block
        source.last_success_at = utc_now()
        source.error_count = 0

        log.status = "success"
        log.fetched_count = fetched_count
        log.new_count = new_count
        log.ended_at = utc_now()

        db.commit()
        db.refresh(log)
        return log

    except Exception as exc:
        # Roll back any partial article/story inserts from the failed batch.
        # `log` and `source` were committed at the start of the run, so they
        # already have real IDs; here we only update the log status and persist.
        db.rollback()
        source.error_count += 1
        log.status = "failed"
        log.error_message = str(exc)
        log.ended_at = utc_now()

        db.commit()
        db.refresh(log)
        return log
