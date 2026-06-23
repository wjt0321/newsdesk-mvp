import calendar
import html
import re
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from dateutil import parser as date_parser


_IMG_SRC_RE = re.compile(r"<img[^>]+src=\"([^\"]+)\"")
_IMG_SRC_SINGLE_RE = re.compile(r"<img[^>]+src='([^']+)'")


def _extract_image(entry: Any) -> Optional[str]:
    if hasattr(entry, "media_thumbnail") and entry.media_thumbnail:
        url = entry.media_thumbnail[0].get("url")
        if url:
            return url
    if hasattr(entry, "media_content") and entry.media_content:
        url = entry.media_content[0].get("url")
        if url:
            return url
    if hasattr(entry, "links"):
        for link in entry.links:
            if link.get("type", "").startswith("image"):
                return link.get("href")
    if hasattr(entry, "enclosures") and entry.enclosures:
        for enclosure in entry.enclosures:
            if enclosure.get("type", "").startswith("image"):
                href = enclosure.get("href")
                if href:
                    return href

    # Fallback: pull the first <img src="..."> out of the description or
    # content HTML. Many feeds embed their lead image only in the body.
    html_text = ""
    if hasattr(entry, "summary") and entry.summary:
        html_text = entry.summary
    if hasattr(entry, "content") and entry.content:
        first = entry.content[0]
        if isinstance(first, dict):
            html_text = html_text or first.get("value", "")
        elif isinstance(first, str):
            html_text = html_text or first

    if html_text:
        match = _IMG_SRC_RE.search(html_text) or _IMG_SRC_SINGLE_RE.search(html_text)
        if match:
            return html.unescape(match.group(1).strip())

    return None


def _parse_datetime(value: Any) -> Optional[datetime]:
    if not value:
        return None

    if isinstance(value, str):
        try:
            parsed = date_parser.parse(value)
        except Exception:
            return None
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        else:
            parsed = parsed.astimezone(timezone.utc)
        return parsed

    # Feedparser exposes parsed timestamps as time.struct_time (UTC).
    if isinstance(value, (time.struct_time, tuple)):
        try:
            ts = calendar.timegm(value)
            return datetime.fromtimestamp(ts, tz=timezone.utc)
        except Exception:
            return None

    return None


def normalize_entry(source: Any, entry: Any) -> Dict[str, Any]:
    link = getattr(entry, "link", "") or ""
    title = (getattr(entry, "title", "") or "").strip()

    published: Optional[datetime] = None
    for date_attr in ("published", "updated"):
        published = _parse_datetime(getattr(entry, date_attr, None))
        if published is not None:
            break
    if published is None:
        for date_attr in ("published_parsed", "updated_parsed"):
            published = _parse_datetime(getattr(entry, date_attr, None))
            if published is not None:
                break

    summary = getattr(entry, "summary", None) or getattr(entry, "description", None)

    content = None
    if hasattr(entry, "content") and entry.content:
        first = entry.content[0]
        if isinstance(first, dict):
            content = first.get("value")
        elif isinstance(first, str):
            content = first

    return {
        "source_id": source.id,
        "title": title,
        "url": link,
        "canonical_url": link,
        "author": getattr(entry, "author", None),
        "published_at": published,
        "summary_raw": summary,
        "content_text": content,
        "image_url": _extract_image(entry),
        "language": source.language,
    }
