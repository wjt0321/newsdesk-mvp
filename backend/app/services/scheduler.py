import os
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler

from .. import models
from ..database import SessionLocal
from ..utils.time import ensure_utc
from .fetcher import fetch_source


def _fetch_all_enabled_sources():
    if os.environ.get("TESTING") == "1":
        return
    db = SessionLocal()
    try:
        paused = False
        state = db.query(models.SystemState).first()
        if state and state.paused:
            paused = True
        if paused:
            return

        sources = db.query(models.Source).filter(models.Source.enabled == True).all()
        now = datetime.now(timezone.utc)
        for source in sources:
            interval = source.fetch_interval_minutes or 60
            last = ensure_utc(source.last_fetched_at)
            if source.last_fetched_at is None or (now - last).total_seconds() / 60 >= interval:
                try:
                    fetch_source(db, source)
                except Exception as exc:
                    # Log and continue; do not crash scheduler
                    print(f"Scheduled fetch failed for source {source.id}: {exc}")
    finally:
        db.close()


def start_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler()
    scheduler.add_job(_fetch_all_enabled_sources, "interval", minutes=1, id="fetch_sources", replace_existing=True)
    scheduler.start()
    return scheduler


def stop_scheduler(scheduler: BackgroundScheduler) -> None:
    scheduler.shutdown(wait=False)
