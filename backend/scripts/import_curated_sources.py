"""Import the curated 38-source list into the NewsDesk SQLite database.

Usage:
    python scripts/import_curated_sources.py [--clear]

Use ``--clear`` to wipe existing sources, articles, stories and fetch logs before
importing.  Without the flag the script only skips duplicate URLs and imports
missing sources.
"""

from __future__ import annotations

import argparse
import os
import sys
from sqlalchemy import text

from app import database, models
from app.curated_sources import CURATED_SOURCES
from app.services.fetcher import fetch_source


def import_sources(db, clear: bool = False) -> list[models.Source]:
    """Insert curated sources, optionally clearing old data first."""
    if clear:
        # Clear dependent tables first to avoid FK issues.
        db.execute(text("DELETE FROM story_article_links"))
        db.execute(text("DELETE FROM story_ai_summaries"))
        db.execute(text("DELETE FROM stories"))
        db.execute(text("DELETE FROM articles"))
        db.execute(text("DELETE FROM fetch_logs"))
        db.execute(text("DELETE FROM sources"))
        db.commit()
        print("Cleared existing sources, articles, stories, and fetch logs.")

    created: list[models.Source] = []
    for s in CURATED_SOURCES:
        existing = db.query(models.Source).filter(models.Source.url == s.url).first()
        if existing:
            print(f"Skipping duplicate: {s.name}")
            continue
        source = models.Source(
            name=s.name,
            type=s.source_type,
            url=s.url,
            category=s.category,
            language=s.language,
            region=s.region,
            trust_level=s.trust_level,
            fetch_interval_minutes=s.fetch_interval_minutes,
            enabled=True,
        )
        db.add(source)
        created.append(source)
    db.commit()
    for source in created:
        db.refresh(source)
    return created


def run_fetch_pass(db, sources: list[models.Source]) -> dict:
    """Fetch every source once and report results."""
    ok = 0
    failed = 0
    total_new = 0
    total_fetched = 0
    failed_names: list[str] = []
    for source in sources:
        try:
            log = fetch_source(db, source)
            if log.status == "success":
                ok += 1
                total_fetched += log.fetched_count or 0
                total_new += log.new_count or 0
            else:
                failed += 1
                failed_names.append(f"{source.name}: {log.error_message}")
        except Exception as exc:
            failed += 1
            failed_names.append(f"{source.name}: {exc}")
    return {
        "ok": ok,
        "failed": failed,
        "total_fetched": total_fetched,
        "total_new": total_new,
        "failed_names": failed_names,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--clear", action="store_true", help="Wipe existing data before import"
    )
    parser.add_argument(
        "--skip-fetch", action="store_true", help="Only import, do not fetch"
    )
    args = parser.parse_args()

    db = database.SessionLocal()
    try:
        sources = import_sources(db, clear=args.clear)
        print(f"Imported {len(sources)} sources.")
        if not args.skip_fetch:
            stats = run_fetch_pass(db, sources)
            print(f"Fetch pass: {stats['ok']} OK, {stats['failed']} failed")
            print(
                f"Articles fetched: {stats['total_fetched']}, "
                f"new stories/articles: {stats['total_new']}"
            )
            if stats["failed_names"]:
                print("Failed sources:")
                for name in stats["failed_names"]:
                    print(f"  - {name}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
