def test_list_channels(client):
    resp = client.get("/api/channels")
    assert resp.status_code == 200
    channels = resp.json()
    assert isinstance(channels, list)
    assert len(channels) >= 1
    ids = {c["id"] for c in channels}
    assert "ai" in ids
    assert "tech" in ids
    assert all("name" in c for c in channels)


def test_channel_stories_match(client, monkeypatch):
    import app.services.fetcher as fetcher_module

    original_parse = fetcher_module.feedparser.parse

    def _mock_parse(xml: str):
        parsed = original_parse(xml)
        return lambda url: parsed

    created = client.post("/api/sources", json={
        "name": "Channel Test Source",
        "type": "rss",
        "url": "http://example.com/channel",
    })
    source_id = created.json()["id"]

    xml = """<?xml version="1.0"?>
<rss>
  <channel>
    <item><title>OpenAI Unveils AI Breakthrough</title><link>http://example.com/ai</link></item>
    <item><title>Local Weather Update</title><link>http://example.com/weather</link></item>
  </channel>
</rss>"""
    monkeypatch.setattr(fetcher_module.feedparser, "parse", _mock_parse(xml))
    client.post(f"/api/sources/{source_id}/fetch")

    resp = client.get("/api/channels/ai/stories")
    assert resp.status_code == 200
    stories = resp.json()
    assert len(stories) == 1
    assert "OpenAI" in stories[0]["canonical_title"]


def test_channel_not_found(client):
    resp = client.get("/api/channels/nonexistent/stories")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Channel not found"


def test_channel_stories_limit(client):
    resp = client.get("/api/channels/ai/stories?limit=5")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_channel_keyword_uses_whole_word_for_ascii(client, monkeypatch):
    """'us' should not match 'customer' or 'market' should not match 'supermarket'."""
    import app.services.fetcher as fetcher_module

    original_parse = fetcher_module.feedparser.parse

    def _mock_parse(xml: str):
        parsed = original_parse(xml)
        return lambda url: parsed

    created = client.post("/api/sources", json={
        "name": "Keyword Source",
        "type": "rss",
        "url": "http://example.com/keywords",
    })
    source_id = created.json()["id"]

    xml = """<?xml version="1.0"?>
<rss>
  <channel>
    <item><title>Customer Satisfaction Report</title><link>http://example.com/cust</link></item>
    <item><title>Supermarket Sales Rise</title><link>http://example.com/super</link></item>
    <item><title>US Policy Update</title><link>http://example.com/us</link></item>
  </channel>
</rss>"""
    monkeypatch.setattr(fetcher_module.feedparser, "parse", _mock_parse(xml))
    client.post(f"/api/sources/{source_id}/fetch")

    resp = client.get("/api/channels/global/stories")
    assert resp.status_code == 200
    stories = resp.json()
    titles = [s["canonical_title"] for s in stories]
    assert "US Policy Update" in titles
    assert "Customer Satisfaction Report" not in titles
    assert "Supermarket Sales Rise" not in titles
