import pytest

from app.services import content_cleaner


def test_clean_title_strips_html():
    assert content_cleaner.clean_title("<i>COVID-19</i> vaccine update") == "COVID-19 vaccine update"


def test_clean_title_decodes_entities():
    assert content_cleaner.clean_title("A &amp; B &lt;i&gt;test&lt;/i&gt;") == "A & B test"


def test_clean_title_trims_site_suffix():
    assert content_cleaner.clean_title("Great article | Nature News") == "Great article"


def test_clean_summary_strips_tags_and_figures():
    raw = '<p>Paragraph one.</p><figure><img src="x.jpg"><figcaption>img</figcaption></figure><p>Paragraph two.</p>'
    assert content_cleaner.clean_summary(raw) == "Paragraph one. Paragraph two."


def test_clean_summary_truncates_by_sentence():
    raw = "First sentence. Second sentence. Third sentence with more words here."
    assert content_cleaner.clean_summary(raw, max_sentences=2) == "First sentence. Second sentence."


def test_clean_summary_respects_max_chars():
    raw = "First sentence. " + "x " * 200
    result = content_cleaner.clean_summary(raw, max_sentences=10, max_chars=50)
    # The first sentence fits, so we get it without ellipsis.
    assert result == "First sentence."
    assert len(result) <= 50


def test_clean_summary_truncates_long_sentence_with_ellipsis():
    raw = "x " * 200 + "."
    result = content_cleaner.clean_summary(raw, max_sentences=10, max_chars=50)
    assert len(result) <= 50
    assert result.endswith("…")


def test_clean_summary_returns_empty_for_link_only():
    assert content_cleaner.clean_summary("Comments on Hacker News | Source") == ""
    assert content_cleaner.clean_summary("Source: example.com") == ""


def test_clean_summary_handles_chinese():
    raw = "第一段内容。第二段内容。第三段内容。"
    assert content_cleaner.clean_summary(raw, max_sentences=2) == "第一段内容。第二段内容。"


def test_clean_content_text_keeps_paragraphs():
    raw = "<p>One</p><p>Two</p>"
    assert content_cleaner.clean_content_text(raw) == "One\n\nTwo"
