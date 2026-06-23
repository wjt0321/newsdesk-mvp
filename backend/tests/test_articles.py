import hashlib
from datetime import datetime, timedelta, timezone

import app.services.fetcher as fetcher_module
import feedparser
from app import models


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:32]


def test_list_articles_after_fetch(client, monkeypatch):
    created = client.post("/api/sources", json={
        "name": "Test Source",
        "type": "rss",
        "url": "http://example.com/rss",
    })
    source_id = created.json()["id"]

    sample_xml = """<?xml version="1.0"?>
<rss>
  <channel>
    <item><title>One</title><link>http://example.com/one</link></item>
    <item><title>Two</title><link>http://example.com/two</link></item>
  </channel>
</rss>"""
    original_parse = feedparser.parse
    monkeypatch.setattr(fetcher_module.feedparser, "parse", lambda url: original_parse(sample_xml))

    client.post(f"/api/sources/{source_id}/fetch")
    resp = client.get("/api/articles")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert data[0]["title"] in ("One", "Two")

    resp2 = client.get(f"/api/articles?source_id={source_id}&limit=1")
    assert len(resp2.json()) == 1


def test_articles_hours_filter(client, db):
    source_resp = client.post("/api/sources", json={
        "name": "Hours Test Source",
        "type": "rss",
        "url": "http://example.com/rss",
    })
    assert source_resp.status_code == 201
    source_id = source_resp.json()["id"]

    now = datetime.now(timezone.utc)
    articles = [
        models.Article(
            source_id=source_id,
            title="Recent",
            url="http://example.com/recent",
            canonical_url="http://example.com/recent",
            published_at=now - timedelta(hours=2),
            fetched_at=now,
            hash_url=_hash("recent"),
            hash_title=_hash("Recent"),
        ),
        models.Article(
            source_id=source_id,
            title="Old",
            url="http://example.com/old",
            canonical_url="http://example.com/old",
            published_at=now - timedelta(hours=200),
            fetched_at=now,
            hash_url=_hash("old"),
            hash_title=_hash("Old"),
        ),
        models.Article(
            source_id=source_id,
            title="NoPubdateRecent",
            url="http://example.com/nopub",
            canonical_url="http://example.com/nopub",
            published_at=None,
            fetched_at=now - timedelta(hours=1),
            hash_url=_hash("nopub"),
            hash_title=_hash("NoPubdateRecent"),
        ),
    ]
    db.add_all(articles)
    db.commit()

    resp = client.get("/api/articles?hours=24")
    assert resp.status_code == 200
    titles = {a["title"] for a in resp.json()}
    assert "Recent" in titles
    assert "NoPubdateRecent" in titles
    assert "Old" not in titles
