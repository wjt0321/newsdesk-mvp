from app import models


def _find_source(data, source_id):
    for item in data:
        if item["id"] == source_id:
            return item
    return None


def test_source_health_list(client):
    resp = client.get("/api/source-health")
    assert resp.status_code == 200
    data = resp.json()
    # seed_sources inserts default sources in the test fixture.
    assert isinstance(data, list)


def test_source_health_status(client, db):
    from app.utils.time import utc_now

    source = models.Source(
        name="Healthy Source",
        url="http://example.com/healthy",
        enabled=True,
        error_count=0,
        last_success_at=utc_now(),
    )
    db.add(source)
    db.commit()

    resp = client.get("/api/source-health")
    assert resp.status_code == 200
    item = _find_source(resp.json(), source.id)
    assert item is not None
    assert item["status"] == "healthy"
    assert item["article_count_24h"] == 0


def test_source_health_disabled(client, db):
    source = models.Source(
        name="Disabled Source",
        url="http://example.com/disabled",
        enabled=False,
    )
    db.add(source)
    db.commit()

    resp = client.get("/api/source-health")
    item = _find_source(resp.json(), source.id)
    assert item is not None
    assert item["status"] == "disabled"


def test_source_health_broken(client, db):
    source = models.Source(
        name="Broken Source",
        url="http://example.com/broken",
        enabled=True,
        error_count=10,
    )
    db.add(source)
    db.commit()

    resp = client.get("/api/source-health")
    item = _find_source(resp.json(), source.id)
    assert item is not None
    assert item["status"] == "broken"
