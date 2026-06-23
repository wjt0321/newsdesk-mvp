from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import database, models, schemas
from ..services.matcher import matching_stories_for_rule, rule_matches_story
from ..services.story_serializer import story_to_read

router = APIRouter(prefix="/watch-rules", tags=["watch-rules"])


@router.get("", response_model=List[schemas.WatchRuleRead])
def list_watch_rules(db: Session = Depends(database.get_db)):
    return db.query(models.WatchRule).order_by(models.WatchRule.created_at.desc()).all()


@router.post("", response_model=schemas.WatchRuleRead, status_code=201)
def create_watch_rule(rule: schemas.WatchRuleCreate, db: Session = Depends(database.get_db)):
    db_rule = models.WatchRule(**rule.model_dump())
    db.add(db_rule)
    try:
        db.commit()
        db.refresh(db_rule)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    return db_rule


@router.get("/{rule_id}", response_model=schemas.WatchRuleRead)
def get_watch_rule(rule_id: int, db: Session = Depends(database.get_db)):
    rule = db.get(models.WatchRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Watch rule not found")
    return rule


@router.patch("/{rule_id}", response_model=schemas.WatchRuleRead)
def update_watch_rule(
    rule_id: int,
    update: schemas.WatchRuleUpdate,
    db: Session = Depends(database.get_db),
):
    rule = db.get(models.WatchRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Watch rule not found")
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(rule, field, value)
    try:
        db.commit()
        db.refresh(rule)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    return rule


@router.delete("/{rule_id}", status_code=204)
def delete_watch_rule(rule_id: int, db: Session = Depends(database.get_db)):
    rule = db.get(models.WatchRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Watch rule not found")
    db.delete(rule)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error")


@router.get("/{rule_id}/stories", response_model=List[schemas.StoryRead])
def list_rule_stories(
    rule_id: int,
    limit: int = 50,
    db: Session = Depends(database.get_db),
):
    rule = db.get(models.WatchRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Watch rule not found")
    stories = matching_stories_for_rule(db, rule, limit=limit)
    return [story_to_read(story) for story in stories[:limit]]
