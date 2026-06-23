import app.services.fetcher as fetcher_module
import feedparser


def _create_source(client, payload):
    resp = client.post("/api/sources", json=payload)
    assert resp.status_code == 201
    return resp.json()["id"]


def _mock_fetch(monkeypatch, sample_xml):
    original_parse = feedparser.parse
    monkeypatch.setattr(
        fetcher_module.feedparser, "parse", lambda url: original_parse(sample_xml)
    )


def test_list_fetch_logs_after_fetch(client, monkeypatch):
    source_id = _create_source(client, {
        "name": "Fetch Log Source",
        "type": "rss",
        "url": "http://example.com/rss",
    })

    sample_xml = """<?xml version="1.0"?>
<rss>
  <channel>
    <item><title>One</title><link>http://example.com/one</link></item>
  </channel>
</rss>"""
    _mock_fetch(monkeypatch, sample_xml)

    fetch_resp = client.post(f"/api/sources/{source_id}/fetch")
    assert fetch_resp.status_code == 200

    resp = client.get("/api/fetch-logs")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["source_id"] == source_id
    assert data[0]["status"] == "success"


def test_fetch_logs_source_id_filter(client, monkeypatch):
    source_a = _create_source(client, {
        "name": "Source A",
        "type": "rss",
        "url": "http://example.com/a",
    })
    source_b = _create_source(client, {
        "name": "Source B",
        "type": "rss",
        "url": "http://example.com/b",
    })

    sample_xml = """<?xml version="1.0"?>
<rss>
  <channel>
    <item><title>X</title><link>http://example.com/x</link></item>
  </channel>
</rss>"""
    _mock_fetch(monkeypatch, sample_xml)

    client.post(f"/api/sources/{source_a}/fetch")
    client.post(f"/api/sources/{source_b}/fetch")

    resp = client.get(f"/api/fetch-logs?source_id={source_a}")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["source_id"] == source_a


def test_fetch_logs_limit(client, monkeypatch):
    source_id = _create_source(client, {
        "name": "Limit Source",
        "type": "rss",
        "url": "http://example.com/rss",
    })

    sample_xml = """<?xml version="1.0"?>
<rss>
  <channel>
    <item><title>One</title><link>http://example.com/one</link></item>
  </channel>
</rss>"""
    _mock_fetch(monkeypatch, sample_xml)

    client.post(f"/api/sources/{source_id}/fetch")
    client.post(f"/api/sources/{source_id}/fetch")

    resp = client.get("/api/fetch-logs?limit=1")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1

    resp_all = client.get("/api/fetch-logs")
    assert resp_all.status_code == 200
    assert len(resp_all.json()) == 2
