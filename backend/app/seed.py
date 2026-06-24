from sqlalchemy.orm import Session

from . import models
from .curated_sources import CURATED_SOURCES


def seed_sources(db: Session) -> None:
    """Ensure bundled curated sources exist.

    Older builds only inserted five sample sources when the database was empty.
    The packaged desktop app can create a fresh runtime database, so seeding must
    be idempotent and able to backfill the full curated catalog into existing
    sample-only databases.
    """
    existing_by_url = {source.url: source for source in db.query(models.Source).all()}
    existing_by_name = {source.name: source for source in db.query(models.Source).all()}

    created = False
    for source_def in CURATED_SOURCES:
        existing = existing_by_url.get(source_def.url) or existing_by_name.get(source_def.name)
        if existing:
            updated = False
            if existing.url != source_def.url:
                existing.url = source_def.url
                updated = True
            if existing.type != source_def.source_type:
                existing.type = source_def.source_type
                updated = True
            if existing.category != source_def.category:
                existing.category = source_def.category
                updated = True
            if existing.language != source_def.language:
                existing.language = source_def.language
                updated = True
            if existing.region != source_def.region:
                existing.region = source_def.region
                updated = True
            if existing.fetch_interval_minutes != source_def.fetch_interval_minutes:
                existing.fetch_interval_minutes = source_def.fetch_interval_minutes
                updated = True
            if existing.trust_level != source_def.trust_level:
                existing.trust_level = source_def.trust_level
                updated = True
            created = created or updated
            continue

        db.add(
            models.Source(
                name=source_def.name,
                type=source_def.source_type,
                url=source_def.url,
                category=source_def.category,
                language=source_def.language,
                region=source_def.region,
                trust_level=source_def.trust_level,
                fetch_interval_minutes=source_def.fetch_interval_minutes,
                enabled=True,
            )
        )
        created = True

    if created:
        db.commit()
