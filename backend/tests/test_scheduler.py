from datetime import datetime, timedelta

from app import models
from app.services import scheduler as scheduler_module


def test_fetch_all_enabled_sources_handles_naive_last_fetched(monkeypatch, db):
    """Regression test: SQLite returns naive datetimes; scheduler must not crash."""
    monkeypatch.delenv("TESTING", raising=False)
    calls = []

    def fake_fetch_source(session, source):
        calls.append(source.id)

    monkeypatch.setattr(scheduler_module, "fetch_source", fake_fetch_source)

    source = models.Source(
        name="Test Source",
        type="rss",
        url="http://example.com/feed.xml",
        enabled=True,
        fetch_interval_minutes=5,
        last_fetched_at=datetime(2026, 6, 22, 8, 0, 0) - timedelta(minutes=10),
    )
    db.add(source)
    db.commit()

    scheduler_module._fetch_all_enabled_sources()

    assert calls == [source.id]
