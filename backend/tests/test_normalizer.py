from unittest.mock import MagicMock

import feedparser

from app.services.normalizer import normalize_entry


def test_normalize_entry():
    source = MagicMock(id=1, language="zh")
    xml = """<?xml version="1.0"?>
<rss>
  <channel>
    <item>
      <title>Test Title</title>
      <link>http://example.com/a</link>
      <pubDate>Mon, 22 Jun 2026 08:00:00 GMT</pubDate>
      <description>Summary text</description>
    </item>
  </channel>
</rss>"""
    parsed = feedparser.parse(xml)
    entry = parsed.entries[0]
    article = normalize_entry(source, entry)

    assert article["title"] == "Test Title"
    assert article["url"] == "http://example.com/a"
    assert article["published_at"].year == 2026
    assert article["summary_raw"] == "Summary text"


def test_normalize_entry_uses_media_thumbnail():
    source = MagicMock(id=2, language="en")
    xml = """<?xml version="1.0"?>
<rss xmlns:media="http://search.yahoo.com/mrss">
  <channel>
    <item>
      <title>Thumbnail Entry</title>
      <link>http://example.com/b</link>
      <pubDate>Mon, 22 Jun 2026 09:00:00 GMT</pubDate>
      <media:thumbnail url="http://example.com/thumb.jpg" />
    </item>
  </channel>
</rss>"""
    parsed = feedparser.parse(xml)
    entry = parsed.entries[0]
    article = normalize_entry(source, entry)

    assert article["image_url"] == "http://example.com/thumb.jpg"


def test_normalize_entry_atom_updated_fallback():
    source = MagicMock(id=3, language="en")
    xml = """<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Atom Entry</title>
    <link href="http://example.com/c"/>
    <updated>2026-06-22T10:00:00+02:00</updated>
    <summary>Atom summary</summary>
  </entry>
</feed>"""
    parsed = feedparser.parse(xml)
    entry = parsed.entries[0]
    article = normalize_entry(source, entry)

    assert article["title"] == "Atom Entry"
    assert article["url"] == "http://example.com/c"
    assert article["published_at"].year == 2026
    assert article["published_at"].tzinfo is not None
    # +02:00 should become UTC 08:00
    assert article["published_at"].hour == 8
    assert article["summary_raw"] == "Atom summary"


def test_normalize_entry_missing_fields():
    source = MagicMock(id=4, language="en")
    xml = """<?xml version="1.0"?>
<rss>
  <channel>
    <item>
      <link>http://example.com/d</link>
    </item>
  </channel>
</rss>"""
    parsed = feedparser.parse(xml)
    entry = parsed.entries[0]
    article = normalize_entry(source, entry)

    assert article["title"] == ""
    assert article["url"] == "http://example.com/d"
    assert article["published_at"] is None
    assert article["summary_raw"] is None
    assert article["content_text"] is None
    assert article["image_url"] is None


def test_normalize_entry_published_parsed_fallback():
    source = MagicMock(id=5, language="en")
    xml = """<?xml version="1.0"?>
<rss>
  <channel>
    <item>
      <title>Parsed Date Entry</title>
      <link>http://example.com/e</link>
      <pubDate>Mon, 22 Jun 2026 08:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>"""
    parsed = feedparser.parse(xml)
    entry = parsed.entries[0]
    # Simulate a feed that only exposes the parsed tuple (some feeds do this).
    entry["published"] = ""
    entry["published_parsed"] = (2026, 6, 22, 8, 0, 0, 0, 173, 0)

    article = normalize_entry(source, entry)

    assert article["title"] == "Parsed Date Entry"
    assert article["published_at"] is not None
    assert article["published_at"].year == 2026
    assert article["published_at"].month == 6
    assert article["published_at"].day == 22


def test_normalize_entry_extracts_image_from_html():
    source = MagicMock(id=6, language="en")
    xml = """<?xml version="1.0"?>
<rss>
  <channel>
    <item>
      <title>HTML Image Entry</title>
      <link>http://example.com/f</link>
      <description>&lt;p&gt;&lt;img src="http://example.com/lead.jpg" alt="lead" /&gt; summary&lt;/p&gt;</description>
    </item>
  </channel>
</rss>"""
    parsed = feedparser.parse(xml)
    entry = parsed.entries[0]

    article = normalize_entry(source, entry)

    assert article["image_url"] == "http://example.com/lead.jpg"
