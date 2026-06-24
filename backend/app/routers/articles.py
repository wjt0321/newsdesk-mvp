from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, or_
from sqlalchemy.orm import Session, joinedload

from .. import database, models, schemas
from ..services.content_cleaner import clean_content_text, clean_summary, clean_title
from ..utils.time import naive_utc_now


router = APIRouter(prefix="/articles", tags=["articles"])


def _article_query(db: Session):
    return db.query(models.Article).options(joinedload(models.Article.source))


def _apply_clean_fields(article: models.Article) -> schemas.ArticleRead:
    read = schemas.ArticleRead.model_validate(article)
    read.clean_title = clean_title(article.title)
    read.clean_summary = clean_summary(article.summary_raw)
    read.clean_content_text = clean_content_text(article.content_text)
    return read


@router.get("", response_model=List[schemas.ArticleRead])
def list_articles(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    source_id: Optional[int] = Query(None),
    hours: Optional[int] = Query(None, ge=1, le=168),
    q: Optional[str] = Query(None, description="Search article title, summary, content or source name"),
    start: Optional[datetime] = Query(None, description="Published/fetched after (UTC)"),
    end: Optional[datetime] = Query(None, description="Published/fetched before (UTC)"),
    db: Session = Depends(database.get_db),
):
    """List articles with optional filtering and full-text-ish search.

    Search currently uses SQLite ``LIKE`` across title, summary and content.
    """
    query = _article_query(db)

    if source_id:
        query = query.filter(models.Article.source_id == source_id)

    if hours:
        since = naive_utc_now() - timedelta(hours=hours)
        # Prefer published_at when available; fallback to fetched_at for items without a date.
        query = query.filter(
            or_(
                models.Article.published_at >= since,
                models.Article.published_at.is_(None) & (models.Article.fetched_at >= since),
            )
        )

    if start:
        query = query.filter(models.Article.fetched_at >= start)
    if end:
        query = query.filter(models.Article.fetched_at <= end)

    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.join(models.Article.source).filter(
            or_(
                models.Article.title.ilike(term),
                models.Article.summary_raw.ilike(term),
                models.Article.content_text.ilike(term),
                models.Source.name.ilike(term),
            )
        )

    articles = (
        query.order_by(desc(models.Article.published_at), desc(models.Article.fetched_at))
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [_apply_clean_fields(a) for a in articles]


@router.get("/{article_id}", response_model=schemas.ArticleRead)
def get_article(article_id: int, db: Session = Depends(database.get_db)):
    article = _article_query(db).filter(models.Article.id == article_id).first()
    if not article:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Article not found")
    return _apply_clean_fields(article)
