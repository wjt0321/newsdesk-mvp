from app import models
from app.services.ai_summary import generate_summary, get_cached_summary


def test_ai_summary_disabled_by_default(db):
    story = models.Story(canonical_title="Test Story")
    db.add(story)
    db.commit()

    result = generate_summary(db, story)
    assert result is None


def test_ai_summary_caches_when_enabled(db, monkeypatch):
    monkeypatch.setattr("app.services.ai_summary.settings.ai_enabled", True)
    monkeypatch.setattr("app.services.ai_summary.settings.ai_daily_limit", 10)

    story = models.Story(canonical_title="Cached Story")
    db.add(story)
    db.commit()

    first = generate_summary(db, story)
    assert first is not None
    assert first.summary is not None
    assert first.source_fingerprint is not None

    cached = get_cached_summary(db, story)
    assert cached is not None
    assert cached.id == first.id


def test_ai_summary_daily_limit(db, monkeypatch):
    monkeypatch.setattr("app.services.ai_summary.settings.ai_enabled", True)
    monkeypatch.setattr("app.services.ai_summary.settings.ai_daily_limit", 1)

    story1 = models.Story(canonical_title="First Story")
    story2 = models.Story(canonical_title="Second Story")
    db.add_all([story1, story2])
    db.commit()

    generate_summary(db, story1)
    second = generate_summary(db, story2)
    assert second is None
