from app import models


def _create_source(client, payload):
    resp = client.post("/api/sources", json=payload)
    assert resp.status_code == 201
    return resp.json()["id"]


def test_create_and_list_sources(client):
    source_id = _create_source(client, {
        "name": "BBC Top Stories",
        "type": "rss",
        "url": "https://feeds.bbci.co.uk/news/rss.xml",
        "category": "global",
        "language": "en",
    })
    assert source_id is not None

    resp = client.get("/api/sources")
    assert resp.status_code == 200
    sources = resp.json()
    assert any(s["id"] == source_id for s in sources)


def test_get_source(client):
    source_id = _create_source(client, {
        "name": "The Guardian",
        "type": "rss",
        "url": "https://www.theguardian.com/world/rss",
    })

    resp = client.get(f"/api/sources/{source_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "The Guardian"


def test_update_source(client):
    source_id = _create_source(client, {
        "name": "The Guardian",
        "type": "rss",
        "url": "https://www.theguardian.com/world/rss",
    })

    resp = client.patch(f"/api/sources/{source_id}", json={"enabled": False})
    assert resp.status_code == 200
    assert resp.json()["enabled"] is False


def test_delete_source(client):
    source_id = _create_source(client, {
        "name": "The Guardian",
        "type": "rss",
        "url": "https://www.theguardian.com/world/rss",
    })

    resp = client.delete(f"/api/sources/{source_id}")
    assert resp.status_code == 204

    resp = client.get(f"/api/sources/{source_id}")
    assert resp.status_code == 404


def test_delete_source_with_articles_and_logs_cascade(client, db, monkeypatch):
    import app.services.fetcher as fetcher_module

    source_id = _create_source(client, {
        "name": "Cascade Source",
        "type": "rss",
        "url": "http://example.com/cascade",
    })

    sample_xml = """<?xml version="1.0"?>
<rss>
  <channel>
    <item>
      <title>Cascade Story</title>
      <link>http://example.com/cascade/1</link>
    </item>
  </channel>
</rss>"""
    original_parse = fetcher_module.feedparser.parse
    monkeypatch.setattr(fetcher_module.feedparser, "parse", lambda url: original_parse(sample_xml))

    client.post(f"/api/sources/{source_id}/fetch")
    assert db.query(models.Article).filter_by(source_id=source_id).count() == 1
    assert db.query(models.FetchLog).filter_by(source_id=source_id).count() == 1

    resp = client.delete(f"/api/sources/{source_id}")
    assert resp.status_code == 204

    assert db.query(models.Article).filter_by(source_id=source_id).count() == 0
    assert db.query(models.FetchLog).filter_by(source_id=source_id).count() == 0
    assert db.query(models.Source).filter_by(id=source_id).count() == 0


def test_get_source_not_found(client):
    resp = client.get("/api/sources/999")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Source not found"


def test_delete_source_not_found(client):
    resp = client.delete("/api/sources/999")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Source not found"


def test_update_source_not_found(client):
    resp = client.patch("/api/sources/999", json={"enabled": False})
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Source not found"
