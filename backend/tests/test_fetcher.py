import feedparser

import app.services.fetcher as fetcher_module
from app.models import Article


def test_fetch_source_dedup(client, monkeypatch):
    created = client.post("/api/sources", json={
        "name": "Test Source",
        "type": "rss",
        "url": "http://example.com/rss",
    })
    source_id = created.json()["id"]

    sample_xml = """<?xml version="1.0"?>
<rss>
  <channel>
    <item>
      <title>Unique Story</title>
      <link>http://example.com/unique</link>
      <description>Desc</description>
    </item>
  </channel>
</rss>"""

    original_parse = feedparser.parse
    monkeypatch.setattr(fetcher_module.feedparser, "parse", lambda url: original_parse(sample_xml))

    resp = client.post(f"/api/sources/{source_id}/fetch")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["new_count"] == 1
    assert data["fetched_count"] == 1

    resp2 = client.post(f"/api/sources/{source_id}/fetch")
    data2 = resp2.json()
    assert data2["new_count"] == 0
    assert data2["fetched_count"] == 1


def test_fetch_source_failure_logged(client, db, monkeypatch):
    created = client.post("/api/sources", json={
        "name": "Bad Source",
        "type": "rss",
        "url": "http://example.com/bad",
    })
    source_id = created.json()["id"]

    def boom(url):
        raise RuntimeError("network down")

    monkeypatch.setattr(fetcher_module.feedparser, "parse", boom)

    resp = client.post(f"/api/sources/{source_id}/fetch")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "failed"
    assert "network down" in data["error_message"]

    source = client.get(f"/api/sources/{source_id}").json()
    assert source["error_count"] == 1

    articles = db.query(Article).all()
    assert len(articles) == 0


def test_fetch_source_failure_persists_last_fetched_at(client, monkeypatch):
    created = client.post("/api/sources", json={
        "name": "Bad Source",
        "type": "rss",
        "url": "http://example.com/bad",
    })
    source_id = created.json()["id"]

    def boom(url):
        raise RuntimeError("network down")

    monkeypatch.setattr(fetcher_module.feedparser, "parse", boom)

    resp = client.post(f"/api/sources/{source_id}/fetch")
    assert resp.status_code == 200
    assert resp.json()["status"] == "failed"

    source = client.get(f"/api/sources/{source_id}").json()
    assert source["last_fetched_at"] is not None


def test_fetch_source_skips_empty_titles(client, monkeypatch):
    created = client.post("/api/sources", json={
        "name": "Empty Title Source",
        "type": "rss",
        "url": "http://example.com/empty",
    })
    source_id = created.json()["id"]

    sample_xml = """<?xml version="1.0"?>
<rss>
  <channel>
    <item>
      <title>  </title>
      <link>http://example.com/empty/1</link>
    </item>
    <item>
      <link>http://example.com/empty/2</link>
    </item>
    <item>
      <title>Valid Story</title>
      <link>http://example.com/empty/3</link>
    </item>
  </channel>
</rss>"""

    original_parse = feedparser.parse
    monkeypatch.setattr(fetcher_module.feedparser, "parse", lambda url: original_parse(sample_xml))

    resp = client.post(f"/api/sources/{source_id}/fetch")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["fetched_count"] == 1
    assert data["new_count"] == 1
