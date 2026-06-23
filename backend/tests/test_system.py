def test_pause_and_resume_fetching(client, db):
    from app.models import Source, SystemState

    resp = client.get("/api/system/status")
    assert resp.status_code == 200
    assert resp.json()["paused"] is False

    resp = client.post("/api/system/pause")
    assert resp.status_code == 200
    assert resp.json()["paused"] is True

    resp = client.get("/api/system/status")
    assert resp.status_code == 200
    assert resp.json()["paused"] is True

    resp = client.post("/api/system/resume")
    assert resp.status_code == 200
    assert resp.json()["paused"] is False

    resp = client.get("/api/system/status")
    assert resp.status_code == 200
    assert resp.json()["paused"] is False

    state = db.query(SystemState).first()
    assert state is not None
    assert state.paused is False


def test_pause_preserves_manually_disabled_sources(client, db):
    from app.models import Source, SystemState

    sources = db.query(Source).order_by(Source.id).all()
    assert len(sources) >= 2

    # Disable one source manually, leave the others enabled
    sources[0].enabled = False
    db.commit()

    initially_enabled_ids = {s.id for s in sources[1:]}

    resp = client.post("/api/system/pause")
    assert resp.status_code == 200
    assert resp.json()["paused"] is True

    state = db.query(SystemState).first()
    assert state is not None
    assert state.paused is True
    import json

    assert set(json.loads(state.enabled_source_ids or "[]")) == initially_enabled_ids

    # All sources should now be disabled
    assert db.query(Source).filter(Source.enabled == True).count() == 0

    resp = client.post("/api/system/resume")
    assert resp.status_code == 200
    assert resp.json()["paused"] is False

    # Manually disabled source should stay disabled; the rest should be re-enabled
    enabled_ids = {s.id for s in db.query(Source).filter(Source.enabled == True).all()}
    assert sources[0].id not in enabled_ids
    assert enabled_ids == initially_enabled_ids


def test_pause_status_with_all_sources_disabled(client, db):
    from app.models import Source, SystemState

    state = SystemState(paused=False)
    db.add(state)
    db.commit()

    db.query(Source).update({Source.enabled: False})
    db.commit()

    resp = client.get("/api/system/status")
    assert resp.status_code == 200
    assert resp.json()["paused"] is False


def test_fetch_rejected_while_paused(client):
    from app.models import Source

    source_resp = client.post("/api/sources", json={
        "name": "Paused Test",
        "type": "rss",
        "url": "http://example.com/paused",
    })
    source_id = source_resp.json()["id"]

    resp = client.post("/api/system/pause")
    assert resp.status_code == 200
    assert resp.json()["paused"] is True

    resp = client.post(f"/api/sources/{source_id}/fetch")
    assert resp.status_code == 409
    assert "paused" in resp.json()["detail"].lower()
