import hashlib
import threading
from typing import Any

import feedparser
import httpx
from sqlalchemy.orm import Session

from .. import database, models
from ..utils.time import utc_now
from .normalizer import normalize_entry
from .story_engine import assign_article_to_story


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:32]


def _normalize_title(title: str) -> str:
    """Lowercase and remove non-alphanumeric characters for comparison."""
    return "".join(ch.lower() for ch in title if ch.isalnum())


_FETCH_TIMEOUT = 30
_FETCH_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 NewsDesk/0.1.0"
)


def _fetch_text(url: str) -> httpx.Response:
    headers = {
        "User-Agent": _FETCH_USER_AGENT,
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        "Accept-Encoding": "gzip, deflate",  # avoid brotli decoder bugs on some feeds
    }
    response = httpx.get(url, timeout=_FETCH_TIMEOUT, follow_redirects=True, headers=headers)
    response.raise_for_status()
    return response


def _parse_feed(source: models.Source) -> Any:
    # Fetch every source with a modern browser UA. Many sites block
    # feedparser's default urllib user agent or return 403/503; using httpx
    # gives us explicit status codes, redirects, and better error messages.
    response = _fetch_text(source.url)
    data = feedparser.parse(response.text)

    # feedparser swallows network-level failures and returns an empty/bozo
    # feed. Treat an empty, bozo-marked result as a fetch failure so the
    # user sees a real error instead of "success, 0 articles".
    if data.bozo and not data.entries:
        exc = data.get("bozo_exception")
        raise RuntimeError(f"Failed to fetch feed: {exc or 'unknown'}")

    if response.status_code >= 400:
        raise RuntimeError(f"Feed returned HTTP {response.status_code}")

    # Some sites return an HTML page (paywall, redirect, or dead URL) with no
    # feed entries. Detect that instead of silently recording "success, 0".
    content_type = response.headers.get("content-type", "").lower()
    has_feed_identity = bool(data.feed.get("title") or data.feed.get("link"))
    if content_type.startswith("text/html") and not data.entries:
        raise RuntimeError("Feed URL returned an HTML page instead of an RSS/Atom feed")
    if not data.entries and not has_feed_identity:
        raise RuntimeError("Feed is empty or invalid")

    return data


def _execute_fetch(db: Session, source: models.Source, log: models.FetchLog) -> None:
    """Run the actual fetch/parse/insert logic against an already-created log."""
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

        source.last_success_at = utc_now()
        source.error_count = 0

        log.status = "success"
        log.fetched_count = fetched_count
        log.new_count = new_count
        log.ended_at = utc_now()

        db.commit()

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


def fetch_source(db: Session, source: models.Source) -> models.FetchLog:
    """Synchronously fetch a source. Used by the scheduler."""
    log = models.FetchLog(source_id=source.id, status="running")
    db.add(log)
    source.last_fetched_at = utc_now()
    db.commit()
    db.refresh(log)

    _execute_fetch(db, source, log)
    db.refresh(log)
    return log


def _background_fetch(source_id: int, log_id: int) -> None:
    """Run a fetch in a background thread using a fresh DB session."""
    db = database.SessionLocal()
    try:
        source = db.get(models.Source, source_id)
        log = db.get(models.FetchLog, log_id)
        if source is None or log is None:
            return
        _execute_fetch(db, source, log)
    finally:
        db.close()


def start_fetch_async(db: Session, source: models.Source) -> models.FetchLog:
    """Create a fetch log and run the fetch in a background thread.

    Returns immediately so the HTTP response is not blocked by feed parsing.
    """
    log = models.FetchLog(source_id=source.id, status="running")
    db.add(log)
    source.last_fetched_at = utc_now()
    db.commit()
    db.refresh(log)

    thread = threading.Thread(
        target=_background_fetch,
        args=(source.id, log.id),
        daemon=True,
    )
    thread.start()
    return log
