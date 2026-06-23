from datetime import timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import database, models, schemas
from ..utils.time import naive_utc_now

router = APIRouter(prefix="/articles", tags=["articles"])


@router.get("", response_model=List[schemas.ArticleRead])
def list_articles(
    source_id: Optional[int] = None,
    hours: Optional[int] = Query(None, ge=1, le=168),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(database.get_db),
):
    q = db.query(models.Article).order_by(models.Article.published_at.desc())
    if source_id:
        q = q.filter(models.Article.source_id == source_id)
    if hours:
        since = naive_utc_now() - timedelta(hours=hours)
        q = q.filter(
            func.coalesce(models.Article.published_at, models.Article.fetched_at) >= since
        )
    return q.offset(offset).limit(limit).all()
