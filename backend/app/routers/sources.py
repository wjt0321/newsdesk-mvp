from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import database, models, schemas
from ..services.fetcher import fetch_source

router = APIRouter(prefix="/sources", tags=["sources"])


def _is_paused(db: Session) -> bool:
    state = db.query(models.SystemState).first()
    return state is not None and state.paused


@router.get("", response_model=List[schemas.SourceRead])
def list_sources(db: Session = Depends(database.get_db)):
    return db.query(models.Source).order_by(models.Source.created_at.desc()).all()


@router.post("", response_model=schemas.SourceRead, status_code=201)
def create_source(source: schemas.SourceCreate, db: Session = Depends(database.get_db)):
    db_source = models.Source(**source.model_dump())
    db.add(db_source)
    try:
        db.commit()
        db.refresh(db_source)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    return db_source


@router.get("/{source_id}", response_model=schemas.SourceRead)
def get_source(source_id: int, db: Session = Depends(database.get_db)):
    source = db.get(models.Source, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    return source


@router.patch("/{source_id}", response_model=schemas.SourceRead)
def update_source(
    source_id: int,
    update: schemas.SourceUpdate,
    db: Session = Depends(database.get_db),
):
    source = db.get(models.Source, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(source, field, value)
    try:
        db.commit()
        db.refresh(source)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    return source


@router.delete("/{source_id}", status_code=204)
def delete_source(source_id: int, db: Session = Depends(database.get_db)):
    source = db.get(models.Source, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    db.delete(source)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error")


@router.post("/{source_id}/fetch", response_model=schemas.FetchLogRead)
def trigger_fetch(source_id: int, db: Session = Depends(database.get_db)):
    if _is_paused(db):
        raise HTTPException(status_code=409, detail="Fetching is paused")
    source = db.get(models.Source, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    return fetch_source(db, source)
