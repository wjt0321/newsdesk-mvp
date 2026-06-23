from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import schemas
from ..database import get_db
from ..services.briefing import generate_briefing

router = APIRouter(prefix="/api/briefing", tags=["briefing"])


@router.get("", response_model=schemas.BriefingRead)
def get_briefing(db: Session = Depends(get_db)):
    """Get the daily briefing for the last 24 hours."""
    return generate_briefing(db)
