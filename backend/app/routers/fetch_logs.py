from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .. import database, models, schemas

router = APIRouter(prefix="/fetch-logs", tags=["fetch_logs"])


@router.get("", response_model=List[schemas.FetchLogRead])
def list_fetch_logs(
    source_id: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(database.get_db),
):
    q = db.query(models.FetchLog).order_by(models.FetchLog.started_at.desc())
    if source_id:
        q = q.filter(models.FetchLog.source_id == source_id)
    return q.limit(limit).all()
