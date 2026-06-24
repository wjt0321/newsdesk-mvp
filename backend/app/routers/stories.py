from datetime import timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func, or_
from sqlalchemy.orm import Session, joinedload

from .. import database, models, schemas
from ..services.content_cleaner import clean_summary, clean_title
from ..services.story_engine import merge_stories, split_article_from_story
from ..services.story_diff import generate_story_diff
from ..services.story_serializer import story_to_read
from ..utils.time import naive_utc_now

router = APIRouter(prefix="/stories", tags=["stories"])


def _story_query(db: Session):
    return db.query(models.Story).options(
        joinedload(models.Story.article_links)
        .joinedload(models.StoryArticleLink.article)
        .joinedload(models.Article.source)
    )


@router.get("", response_model=List[schemas.StoryRead])
def list_stories(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    hours: Optional[int] = Query(None, ge=1, le=168),
    needs_review: Optional[bool] = Query(None),
    q: Optional[str] = Query(None, description="Search story title, summary, article title or source name"),
    db: Session = Depends(database.get_db),
):
    query = _story_query(db)
    if hours:
        since = naive_utc_now() - timedelta(hours=hours)
        query = query.filter(models.Story.last_updated_at >= since)
    if needs_review is not None:
        query = query.filter(models.Story.needs_review == needs_review)

    search_term = q.strip() if isinstance(q, str) and q else None
    if search_term:
        term = f"%{search_term}%"
        query = query.join(models.Story.article_links).join(models.StoryArticleLink.article).join(
            models.Article.source
        ).filter(
            or_(
                models.Story.canonical_title.ilike(term),
                models.Story.short_title.ilike(term),
                models.Story.summary.ilike(term),
                models.Article.title.ilike(term),
                models.Article.summary_raw.ilike(term),
                models.Source.name.ilike(term),
            )
        ).distinct()

    # Sort at the DB level to avoid loading the entire table into memory.
    # heat_score is recomputed on every article change; last_updated_at breaks ties.
    stories = (
        query.order_by(desc(models.Story.heat_score), desc(models.Story.last_updated_at))
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [story_to_read(story) for story in stories]


@router.get("/by-source/{source_id}", response_model=List[schemas.StoryRead])
def list_stories_by_source(
    source_id: int,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(database.get_db),
):
    """Return stories that contain at least one article from the given source."""
    query = (
        _story_query(db)
        .join(models.Story.article_links)
        .join(models.StoryArticleLink.article)
        .filter(models.Article.source_id == source_id)
        .distinct()
    )
    stories = (
        query.order_by(desc(models.Story.last_updated_at))
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [story_to_read(story) for story in stories]


@router.get("/hot", response_model=List[schemas.StoryRead])
def hot_stories(
    limit: int = Query(20, ge=1, le=500),
    db: Session = Depends(database.get_db),
):
    return list_stories(limit=limit, offset=0, hours=None, needs_review=None, q=None, db=db)


@router.get("/{story_id}", response_model=schemas.StoryRead)
def get_story(story_id: int, db: Session = Depends(database.get_db)):
    story = (
        _story_query(db)
        .filter(models.Story.id == story_id)
        .first()
    )
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return story_to_read(story)


@router.post("/{story_id}/split-article/{article_id}", response_model=schemas.StoryRead)
def split_story_article(
    story_id: int,
    article_id: int,
    db: Session = Depends(database.get_db),
):
    story = db.query(models.Story).filter(models.Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    article = db.query(models.Article).filter(models.Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    try:
        new_story = split_article_from_story(db, story, article)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    db.commit()
    return story_to_read(new_story)


@router.post("/merge", response_model=schemas.StoryRead)
def merge_two_stories(
    source_id: int,
    target_id: int,
    db: Session = Depends(database.get_db),
):
    if source_id == target_id:
        raise HTTPException(status_code=400, detail="Cannot merge a story into itself")

    source = db.query(models.Story).filter(models.Story.id == source_id).first()
    target = db.query(models.Story).filter(models.Story.id == target_id).first()
    if not source or not target:
        raise HTTPException(status_code=404, detail="Story not found")

    try:
        merged = merge_stories(db, source, target)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    db.commit()
    return story_to_read(merged)


@router.get("/{story_id}/diff", response_model=schemas.StoryDiffRead)
def get_story_diff(story_id: int, db: Session = Depends(database.get_db)):
    story = (
        _story_query(db)
        .filter(models.Story.id == story_id)
        .first()
    )
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return generate_story_diff(story)
