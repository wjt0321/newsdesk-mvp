import feedparser

import app.services.fetcher as fetcher_module
from app import models

_ORIGINAL_PARSE = feedparser.parse


def _mock_parse(xml: str):
    parsed = _ORIGINAL_PARSE(xml)

    def parser(url):
        return parsed

    return parser


def _create_source_with_two_articles(client, monkeypatch):
    created = client.post("/api/sources", json={
        "name": "Split Merge Source",
        "type": "rss",
        "url": "http://example.com/split-merge",
    })
    source_id = created.json()["id"]

    xml = """<?xml version="1.0"?>
<rss>
  <channel>
    <item>
      <title>Global Tech Summit Announces Keynote Speakers</title>
      <link>http://example.com/angle-1</link>
    </item>
    <item>
      <title>Global Tech Summit Announces Keynote Speakers Today</title>
      <link>http://example.com/angle-2</link>
    </item>
  </channel>
</rss>"""
    monkeypatch.setattr(fetcher_module.feedparser, "parse", _mock_parse(xml))
    client.post(f"/api/sources/{source_id}/fetch")

    stories = client.get("/api/stories").json()
    return source_id, stories


def test_split_article_from_story(client, db, monkeypatch):
    source_id, stories = _create_source_with_two_articles(client, monkeypatch)
    assert len(stories) == 1
    story_id = stories[0]["id"]
    article_id = stories[0]["article_ids"][0]

    resp = client.post(f"/api/stories/{story_id}/split-article/{article_id}")
    assert resp.status_code == 200
    new_story = resp.json()
    assert new_story["id"] != story_id
    assert article_id in new_story["article_ids"]
    assert article_id not in [aid for aid in client.get(f"/api/stories/{story_id}").json()["article_ids"]]


def test_split_article_not_in_story(client, db, monkeypatch):
    source_id, stories = _create_source_with_two_articles(client, monkeypatch)
    story_id = stories[0]["id"]

    # Create another story with a different article.
    other = client.post("/api/sources", json={
        "name": "Other Source",
        "type": "rss",
        "url": "http://example.com/other",
    }).json()["id"]
    xml = """<?xml version="1.0"?>
<rss><channel><item><title>Other Story</title><link>http://example.com/other-1</link></item></channel></rss>"""
    monkeypatch.setattr(fetcher_module.feedparser, "parse", _mock_parse(xml))
    client.post(f"/api/sources/{other}/fetch")

    other_story = client.get("/api/stories").json()[-1]
    other_article = other_story["article_ids"][0]

    resp = client.post(f"/api/stories/{story_id}/split-article/{other_article}")
    assert resp.status_code == 400


def test_merge_stories(client, db, monkeypatch):
    # Create two separate stories.
    s1 = client.post("/api/sources", json={
        "name": "Merge Source 1",
        "type": "rss",
        "url": "http://example.com/merge1",
    }).json()["id"]
    xml1 = """<?xml version="1.0"?>
<rss><channel><item><title>Story One</title><link>http://example.com/one</link></item></channel></rss>"""
    monkeypatch.setattr(feedparser, "parse", _mock_parse(xml1))
    client.post(f"/api/sources/{s1}/fetch")

    s2 = client.post("/api/sources", json={
        "name": "Merge Source 2",
        "type": "rss",
        "url": "http://example.com/merge2",
    }).json()["id"]
    xml2 = """<?xml version="1.0"?>
<rss><channel><item><title>Story Two</title><link>http://example.com/two</link></item></channel></rss>"""
    monkeypatch.setattr(feedparser, "parse", _mock_parse(xml2))
    client.post(f"/api/sources/{s2}/fetch")

    stories = client.get("/api/stories").json()
    source_story = next(s for s in stories if "One" in s["canonical_title"])
    target_story = next(s for s in stories if "Two" in s["canonical_title"])

    resp = client.post(f"/api/stories/merge?source_id={source_story['id']}&target_id={target_story['id']}")
    assert resp.status_code == 200
    merged = resp.json()
    assert merged["id"] == target_story["id"]
    assert len(merged["article_ids"]) == 2
    assert merged["merge_reason"] == "manual_merge"

    # Source story should be gone.
    assert client.get(f"/api/stories/{source_story['id']}").status_code == 404
