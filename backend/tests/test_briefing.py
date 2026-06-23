from app import models
from app.services.briefing import _select_top_stories, generate_briefing


def test_select_top_stories_ignores_low_confidence_and_needs_review(db):
    good = models.Story(
        canonical_title="Good Story",
        confidence=0.9,
        needs_review=False,
        heat_score=100.0,
        status="hot",
        source_count=2,
        article_count=2,
    )
    bad = models.Story(
        canonical_title="Bad Story",
        confidence=0.5,
        needs_review=False,
        heat_score=200.0,
        status="hot",
        source_count=3,
        article_count=3,
    )
    review = models.Story(
        canonical_title="Review Story",
        confidence=0.9,
        needs_review=True,
        heat_score=200.0,
        status="hot",
        source_count=3,
        article_count=3,
    )
    db.add_all([good, bad, review])
    db.commit()

    selected = _select_top_stories(db, limit=10)
    assert len(selected) == 1
    assert selected[0].canonical_title == "Good Story"


def test_generate_briefing_returns_plain_text(db):
    story = models.Story(
        canonical_title="Top Story",
        confidence=0.9,
        needs_review=False,
        heat_score=50.0,
        status="hot",
        source_count=1,
        article_count=1,
    )
    db.add(story)
    db.commit()

    briefing = generate_briefing(db)
    assert briefing.plain_text
    assert "Top Story" in briefing.plain_text
    assert len(briefing.items) == 1
    assert briefing.items[0].rank == 1
