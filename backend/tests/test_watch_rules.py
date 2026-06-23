from app import models


def test_create_and_list_watch_rules(client):
    resp = client.post("/api/watch-rules", json={
        "name": "AI Watch",
        "keywords": "AI,人工智能",
        "enabled": True,
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "AI Watch"
    assert data["keywords"] == "AI,人工智能"
    assert data["enabled"] is True
    rule_id = data["id"]

    resp = client.get("/api/watch-rules")
    assert resp.status_code == 200
    rules = resp.json()
    assert any(r["id"] == rule_id for r in rules)


def test_get_watch_rule(client):
    resp = client.post("/api/watch-rules", json={
        "name": "Market Watch",
        "keywords": "market,股市",
    })
    rule_id = resp.json()["id"]

    resp = client.get(f"/api/watch-rules/{rule_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Market Watch"


def test_update_watch_rule(client):
    resp = client.post("/api/watch-rules", json={
        "name": "Policy Watch",
        "keywords": "policy,监管",
    })
    rule_id = resp.json()["id"]

    resp = client.patch(f"/api/watch-rules/{rule_id}", json={"enabled": False})
    assert resp.status_code == 200
    assert resp.json()["enabled"] is False

    resp = client.patch(f"/api/watch-rules/{rule_id}", json={"keywords": "policy,监管,法规"})
    assert resp.status_code == 200
    assert resp.json()["keywords"] == "policy,监管,法规"


def test_delete_watch_rule(client):
    resp = client.post("/api/watch-rules", json={
        "name": "Temp Watch",
        "keywords": "temp",
    })
    rule_id = resp.json()["id"]

    resp = client.delete(f"/api/watch-rules/{rule_id}")
    assert resp.status_code == 204

    resp = client.get(f"/api/watch-rules/{rule_id}")
    assert resp.status_code == 404


def test_watch_rule_not_found(client):
    resp = client.get("/api/watch-rules/999")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Watch rule not found"


def test_watch_rule_stories_match(client, monkeypatch):
    import app.services.fetcher as fetcher_module

    original_parse = fetcher_module.feedparser.parse

    def _mock_parse(xml: str):
        parsed = original_parse(xml)
        return lambda url: parsed

    created = client.post("/api/sources", json={
        "name": "Rule Test Source",
        "type": "rss",
        "url": "http://example.com/rule",
    })
    source_id = created.json()["id"]

    xml = """<?xml version="1.0"?>
<rss>
  <channel>
    <item><title>OpenAI Releases New AI Model</title><link>http://example.com/ai-1</link></item>
    <item><title>Local Sports Team Wins</title><link>http://example.com/sports</link></item>
  </channel>
</rss>"""
    monkeypatch.setattr(fetcher_module.feedparser, "parse", _mock_parse(xml))
    client.post(f"/api/sources/{source_id}/fetch")

    resp = client.post("/api/watch-rules", json={
        "name": "AI Rule",
        "keywords": "OpenAI,AI",
    })
    rule_id = resp.json()["id"]

    resp = client.get(f"/api/watch-rules/{rule_id}/stories")
    assert resp.status_code == 200
    stories = resp.json()
    assert len(stories) == 1
    assert "OpenAI" in stories[0]["canonical_title"]


def test_matching_stories_for_rule_finds_rare_keyword(db):
    """Regression: rare keywords must be found even if they are not in the top N stories."""
    from app.services.matcher import matching_stories_for_rule

    for i in range(150):
        db.add(models.Story(canonical_title=f"Unrelated popular story {i}"))

    target = models.Story(canonical_title="Rare quantum breakthrough observed")
    db.add(target)
    db.commit()

    rule = models.WatchRule(name="Quantum", keywords="quantum", enabled=True)
    db.add(rule)
    db.commit()

    stories = matching_stories_for_rule(db, rule, limit=10)
    assert len(stories) == 1
    assert stories[0].id == target.id
