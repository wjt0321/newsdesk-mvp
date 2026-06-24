"""Content cleaning utilities for RSS/Atom articles.

The cleaner treats ``summary_raw`` and ``content_text`` as potentially dirty HTML
and produces display-safe plain text.  Original fields are never mutated.
"""

from __future__ import annotations

import html
import re
from typing import Optional

# Tags that should be completely removed including their contents.
_NOISY_TAG_RE = re.compile(
    r"<(script|style|figure|figcaption|svg|video|audio|iframe|embed|object|nav|footer|aside)"
    r"[^>]*>.*?<\/\1>",
    re.IGNORECASE | re.DOTALL,
)

# Inline style / class / data-* / event attributes.
_ATTR_RE = re.compile(r"\s+(style|class|id|data-[\w-]+|onclick|onload|onerror)=[\"'][^\"']*[\"']", re.IGNORECASE)

# Generic HTML tags.
_TAG_RE = re.compile(r"<[^>]+>")

# Collapse whitespace.
_WHITESPACE_RE = re.compile(r"\s+")

# Detect link-only / meta summaries that should not be shown as body text.
_LINK_ONLY_RE = re.compile(r"^(Comments on .*?\| Source|Source:|Read more:|Continue reading|More:)\s*", re.IGNORECASE)

# Common HTML entities are handled by ``html.unescape``.


def _strip_html(value: Optional[str]) -> str:
    if not value:
        return ""
    # Decode entities first so we don't leave ``&lt;i&gt;`` artefacts.
    text = html.unescape(value)
    # Remove noisy tags with their content.
    text = _NOISY_TAG_RE.sub("", text)
    # Strip inline attributes.
    text = _ATTR_RE.sub("", text)
    # Strip remaining tags.
    text = _TAG_RE.sub("", text)
    # Collapse whitespace.
    text = _WHITESPACE_RE.sub(" ", text).strip()
    return text


def clean_title(value: Optional[str]) -> str:
    """Return a plain-text, compact title.

    Preserves scientific notation like ``CO₂`` / ``H₂O`` because feedparser
    often exposes them as ``CO<sub>2</sub>`` which is decoded to ``CO2`` after
    tag stripping.  Callers that need subscript rendering can replace digits on
    a case-by-case basis; this layer focuses on removing markup and noise.
    """
    text = _strip_html(value)
    # Trim trailing source/site noise like " | Nature News".
    text = re.sub(r"\s*[|\-]\s*(Nature News|Hacker News|IGN|GameSpot|CNET|TechCrunch|The Verge|Wired|Ars Technica|PC Gamer|Eurogamer|MIT Technology Review|NPR News|AP News|Reuters|BBC News|凤凰[^\s]*|观察者[^\s]*|36氪|虎嗅|少数派|知乎热榜|豆瓣[^\s]*)\s*$", "", text, flags=re.IGNORECASE)
    return text.strip()


_CHINESE_DELIM_RE = re.compile(r"[。！？]")


def clean_summary(value: Optional[str], max_sentences: int = 2, max_chars: int = 280) -> str:
    """Return a plain-text summary suitable for cards and lists.

    - Strips HTML, scripts, figures, images and inline styles.
    - Truncates to ``max_sentences`` whole sentences, then ``max_chars`` if needed.
    - Returns empty string for link-only meta summaries (e.g. Hacker News "Comments | Source").
    """
    if not value:
        return ""

    text = _strip_html(value)

    if _LINK_ONLY_RE.match(text):
        return ""

    # Split into sentences using a simple heuristic that respects Chinese and Latin punctuation.
    sentence_delimiters = re.compile(r"([。！？.!?])")
    raw_sentences = sentence_delimiters.split(text)
    sentences: list[str] = []
    current = ""
    for part in raw_sentences:
        current += part
        if sentence_delimiters.match(part):
            stripped = current.strip()
            if stripped:
                sentences.append(stripped)
            current = ""
    if current.strip():
        sentences.append(current.strip())

    if not sentences:
        return ""

    # Take up to max_sentences, but ensure we don't exceed max_chars.
    result = ""
    for sentence in sentences[:max_sentences]:
        if len(result) + len(sentence) + 1 > max_chars:
            break
        if not result:
            result = sentence
        elif _CHINESE_DELIM_RE.match(result[-1]):
            result += sentence
        else:
            result = result + " " + sentence

    if not result:
        # Fallback: first sentence truncated hard at max_chars with an ellipsis.
        result = sentences[0][: max_chars - 1].rstrip() + "…" if len(sentences[0]) > max_chars else sentences[0]

    return result


def clean_content_text(value: Optional[str], max_paragraphs: Optional[int] = None) -> str:
    """Return cleaned article body text, optionally limited to N paragraphs."""
    if not value:
        return ""
    # Use placeholders for block/line-break tags so they survive whitespace collapse.
    text = html.unescape(value)
    text = re.sub(r"<\s*br\s*/?\s*>", "\x00LINE\x00", text, flags=re.IGNORECASE)
    text = re.sub(r"</p>\s*", "\x00PARA\x00", text, flags=re.IGNORECASE)
    text = re.sub(r"<\s*/?\s*(div|section|article|header)\s*>", "\x00PARA\x00", text, flags=re.IGNORECASE)
    text = _strip_html(text)
    text = text.replace("\x00LINE\x00", "\n").replace("\x00PARA\x00", "\n\n")
    # Split on paragraph-like boundaries and drop empty paragraphs.
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    if max_paragraphs:
        paragraphs = paragraphs[:max_paragraphs]
    return "\n\n".join(paragraphs)
