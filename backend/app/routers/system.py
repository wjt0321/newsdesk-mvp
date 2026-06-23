import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import database, models

router = APIRouter(prefix="/system", tags=["system"])


def _get_state(db: Session) -> models.SystemState:
    state = db.query(models.SystemState).first()
    if not state:
        state = models.SystemState()
        db.add(state)
        db.commit()
        db.refresh(state)
    return state


@router.post("/pause")
def pause_fetching(db: Session = Depends(database.get_db)):
    state = _get_state(db)
    if not state.paused:
        enabled = db.query(models.Source.id).filter(models.Source.enabled == True).all()
        state.enabled_source_ids = json.dumps([row.id for row in enabled])
        db.query(models.Source).update({models.Source.enabled: False})
        state.paused = True
        db.commit()
    return {"paused": True}


@router.post("/resume")
def resume_fetching(db: Session = Depends(database.get_db)):
    state = _get_state(db)
    if state.paused:
        enabled_ids = set(json.loads(state.enabled_source_ids or "[]"))
        if enabled_ids:
            db.query(models.Source).filter(models.Source.id.in_(enabled_ids)).update(
                {models.Source.enabled: True}, synchronize_session=False
            )
        state.paused = False
        state.enabled_source_ids = "[]"
        db.commit()
    return {"paused": False}


@router.get("/status")
def system_status(db: Session = Depends(database.get_db)):
    state = _get_state(db)
    return {"paused": state.paused}
