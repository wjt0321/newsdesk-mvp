from datetime import timedelta

import feedparser

import app.services.fetcher as fetcher_module
from app.services.story_engine import _extract_entities, _normalize_title, compute_heat_score, story_status
from app.utils.time import utc_now

_ORIGINAL_PARSE = feedparser.parse


def _mock_parse(xml: str):
    parsed = _ORIGINAL_PARSE(xml)

    def parser(url):
        return parsed

    return parser


def test_fetcher_clusters_similar_titles_into_one_story(client, monkeypatch):
    created = client.post("/api/sources", json={
        "name": "Cluster Test Source",
        "type": "rss",
        "url": "http://example.com/rss",
    })
    assert created.status_code == 201
    source_id = created.json()["id"]

    xml = """<?xml version="1.0"?>
<rss>
  <channel>
    <item>
      <title>Global Tech Summit Announces Keynote Speakers</title>
      <link>http://example.com/tech-summit-1</link>
      <description>First report</description>
    </item>
    <item>
      <title>Global Tech Summit Announces Keynote Speakers Today</title>
      <link>http://example.com/tech-summit-2</link>
      <description>Follow-up report</description>
    </item>
  </channel>
</rss>"""

    monkeypatch.setattr(fetcher_module.feedparser, "parse", _mock_parse(xml))

    resp = client.post(f"/api/sources/{source_id}/fetch")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["new_count"] == 2

    stories = client.get("/api/stories").json()
    assert len(stories) == 1
    story = stories[0]
    assert story["article_count"] == 2
    assert story["source_count"] == 1
    assert len(story["article_ids"]) == 2
    assert story["source_names"] == ["Cluster Test Source"]


def test_unrelated_article_creates_second_story(client, monkeypatch):
    first = client.post("/api/sources", json={
        "name": "First Source",
        "type": "rss",
        "url": "http://example.com/first",
    })
    first_id = first.json()["id"]

    xml1 = """<?xml version="1.0"?>
<rss>
  <channel>
    <item>
      <title>Breaking: Major Earthquake Hits Region</title>
      <link>http://example.com/earthquake</link>
    </item>
  </channel>
</rss>"""
    monkeypatch.setattr(fetcher_module.feedparser, "parse", _mock_parse(xml1))
    client.post(f"/api/sources/{first_id}/fetch")

    second = client.post("/api/sources", json={
        "name": "Second Source",
        "type": "rss",
        "url": "http://example.com/second",
    })
    second_id = second.json()["id"]

    xml2 = """<?xml version="1.0"?>
<rss>
  <channel>
    <item>
      <title>Local Sports Team Wins Championship</title>
      <link>http://example.com/sports</link>
    </item>
  </channel>
</rss>"""
    monkeypatch.setattr(fetcher_module.feedparser, "parse", _mock_parse(xml2))
    client.post(f"/api/sources/{second_id}/fetch")

    stories = client.get("/api/stories").json()
    assert len(stories) == 2
    titles = {s["canonical_title"] for s in stories}
    assert "Breaking: Major Earthquake Hits Region" in titles
    assert "Local Sports Team Wins Championship" in titles

    # The two-article story is not present here, so ordering just needs to be stable.
    assert stories[0]["heat_score"] >= stories[1]["heat_score"]


def test_get_story_by_id_returns_article_ids(client, monkeypatch):
    created = client.post("/api/sources", json={
        "name": "Detail Source",
        "type": "rss",
        "url": "http://example.com/detail",
    })
    source_id = created.json()["id"]

    xml = """<?xml version="1.0"?>
<rss>
  <channel>
    <item>
      <title>Policy Update Changes Tax Rules</title>
      <link>http://example.com/tax-policy</link>
    </item>
  </channel>
</rss>"""
    monkeypatch.setattr(fetcher_module.feedparser, "parse", _mock_parse(xml))
    client.post(f"/api/sources/{source_id}/fetch")

    stories = client.get("/api/stories").json()
    story_id = stories[0]["id"]

    detail = client.get(f"/api/stories/{story_id}").json()
    assert detail["id"] == story_id
    assert detail["canonical_title"] == "Policy Update Changes Tax Rules"
    assert len(detail["article_ids"]) == 1

    missing = client.get("/api/stories/999999")
    assert missing.status_code == 404


def test_multi_source_same_event_creates_one_story(client, monkeypatch):
    first = client.post("/api/sources", json={
        "name": "Source Alpha",
        "type": "rss",
        "url": "http://example.com/alpha",
    })
    first_id = first.json()["id"]

    xml1 = """<?xml version="1.0"?>
<rss>
  <channel>
    <item>
      <title>MAJOR POLICY ANNOUNCEMENT TODAY!</title>
      <link>http://example.com/alpha/policy</link>
    </item>
  </channel>
</rss>"""
    monkeypatch.setattr(fetcher_module.feedparser, "parse", _mock_parse(xml1))
    client.post(f"/api/sources/{first_id}/fetch")

    second = client.post("/api/sources", json={
        "name": "Source Beta",
        "type": "rss",
        "url": "http://example.com/beta",
    })
    second_id = second.json()["id"]

    xml2 = """<?xml version="1.0"?>
<rss>
  <channel>
    <item>
      <title>Major Policy Announcement, Today</title>
      <link>http://example.com/beta/policy</link>
    </item>
  </channel>
</rss>"""
    monkeypatch.setattr(fetcher_module.feedparser, "parse", _mock_parse(xml2))
    client.post(f"/api/sources/{second_id}/fetch")

    stories = client.get("/api/stories").json()
    assert len(stories) == 1
    story = stories[0]
    assert story["article_count"] == 2
    assert story["source_count"] == 2
    assert len(story["article_ids"]) == 2
    assert sorted(story["source_names"]) == ["Source Alpha", "Source Beta"]


def test_hot_stories_endpoint(client, monkeypatch):
    created = client.post("/api/sources", json={
        "name": "Hot Source",
        "type": "rss",
        "url": "http://example.com/hot",
    })
    source_id = created.json()["id"]

    xml = """<?xml version="1.0"?>
<rss>
  <channel>
    <item><title>Hot Topic A</title><link>http://example.com/a</link></item>
    <item><title>Hot Topic B</title><link>http://example.com/b</link></item>
  </channel>
</rss>"""
    monkeypatch.setattr(fetcher_module.feedparser, "parse", _mock_parse(xml))
    client.post(f"/api/sources/{source_id}/fetch")

    hot = client.get("/api/stories/hot").json()
    assert isinstance(hot, list)
    assert len(hot) >= 1
    assert all("heat_score" in s for s in hot)


def _make_story(first_seen_at, heat_score=0.0):
    from app import models

    story = models.Story(
        canonical_title="Test Story",
        first_seen_at=first_seen_at,
        last_updated_at=first_seen_at,
    )
    story.heat_score = heat_score
    return story


def test_story_status_breaking():
    story = _make_story(utc_now())
    assert story_status(story) == "breaking"


def test_story_status_hot():
    story = _make_story(utc_now() - timedelta(hours=1), heat_score=50)
    assert story_status(story) == "hot"


def test_story_status_new():
    story = _make_story(utc_now() - timedelta(hours=1), heat_score=10)
    assert story_status(story) == "new"


def test_story_status_developing():
    story = _make_story(utc_now() - timedelta(hours=6), heat_score=10)
    assert story_status(story) == "developing"


def test_story_status_stable():
    story = _make_story(utc_now() - timedelta(days=2), heat_score=10)
    assert story_status(story) == "stable"


def test_compute_heat_score_recency_bonus():
    now = utc_now()
    story = _make_story(now)
    story.source_count = 1
    story.article_count = 1
    score_now = compute_heat_score(story)

    story.last_updated_at = now - timedelta(hours=2)
    score_later = compute_heat_score(story)

    assert score_now > score_later


def test_new_story_has_primary_merge_reason_and_confidence(client, monkeypatch):
    import app.services.fetcher as fetcher_module

    original_parse = fetcher_module.feedparser.parse

    def _mock_parse(xml: str):
        parsed = original_parse(xml)
        return lambda url: parsed

    created = client.post("/api/sources", json={
        "name": "Merge Reason Source",
        "type": "rss",
        "url": "http://example.com/merge",
    })
    source_id = created.json()["id"]

    xml = """<?xml version="1.0"?>
<rss>
  <channel>
    <item><title>Unique Event Happens Today</title><link>http://example.com/unique</link></item>
  </channel>
</rss>"""
    monkeypatch.setattr(fetcher_module.feedparser, "parse", _mock_parse(xml))
    client.post(f"/api/sources/{source_id}/fetch")

    stories = client.get("/api/stories").json()
    assert len(stories) == 1
    story = stories[0]
    assert story["merge_reason"] == "primary"
    assert story["confidence"] == 1.0
    assert story["needs_review"] is False


def test_list_stories_needs_review_filter(client, db):
    from app import models

    high = models.Story(canonical_title="High Confidence Story", needs_review=False, confidence=1.0)
    low = models.Story(canonical_title="Low Confidence Story", needs_review=True, confidence=0.5)
    db.add_all([high, low])
    db.commit()

    all_stories = client.get("/api/stories").json()
    assert len(all_stories) == 2

    review = client.get("/api/stories?needs_review=true").json()
    assert len(review) == 1
    assert review[0]["canonical_title"] == "Low Confidence Story"

    not_review = client.get("/api/stories?needs_review=false").json()
    assert len(not_review) == 1
    assert not_review[0]["canonical_title"] == "High Confidence Story"


def test_normalize_title_removes_site_suffix():
    assert "36氪" not in _normalize_title("AI 新趋势 | 36氪")
    assert _normalize_title("AI 新趋势 | 36氪") == "ai 新 趋 势"


def test_normalize_title_removes_brackets():
    assert _normalize_title("重磅发布（官方）") == "重 磅 发 布"
    assert _normalize_title("[突发] 某地地震") == "某 地 地 震"


def test_normalize_title_removes_stop_words():
    assert "the" not in _normalize_title("The Quick Brown Fox")
    assert "的" not in _normalize_title("中国的经济报告")


def test_normalize_title_full_width_to_half_width():
    assert _normalize_title("ＡＩ新趋势") == "ai 新 趋 势"


def test_extract_entities_finds_tech_keywords():
    entities = _extract_entities("OpenAI releases GPT-5, NVIDIA stock rises")
    assert "openai" in entities
    assert "nvidia" in entities
    assert "gpt" in entities


def test_extract_entities_finds_chinese_entities():
    entities = _extract_entities("中国人工智能大模型发展迅速")
    assert "中国" in entities
    # Cross-language canonicalization maps Chinese AI terms to English keys.
    assert "ai" in entities
    assert "llm" in entities


def test_extract_entities_cross_language_canonicalization():
    english = _extract_entities("NVIDIA launches new AI chip")
    chinese = _extract_entities("英伟达发布新款人工智能芯片")
    # Both should map to shared canonical keys.
    assert "nvidia" in english
    assert "ai" in english
    assert "nvidia" in chinese
    assert "ai" in chinese
    assert english & chinese == {"nvidia", "ai"}
