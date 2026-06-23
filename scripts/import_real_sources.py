#!/usr/bin/env python3
"""Import real sources from real-sources-v1.md into NewsDesk.

Run from the project root with the backend virtual environment:

    cd newsdesk-mvp
    backend/.venv/Scripts/python scripts/import_real_sources.py
"""

import os
import re
import sys
from pathlib import Path

# Make `backend/app` importable and ensure relative DB path resolves to backend/data.
BACKEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

from sqlalchemy.orm import Session

from app import models
from app.database import init_db, SessionLocal


SOURCE_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "real-sources-v1.md",
)


def parse_interval(text: str) -> int:
    """Convert '60 min' / '30 min' into minutes."""
    match = re.search(r"(\d+)", text or "")
    return int(match.group(1)) if match else 60


def parse_markdown_tables(path: str):
    """Yield source rows from all markdown tables in the file."""
    if not os.path.exists(path):
        raise FileNotFoundError(f"Source list not found: {path}")

    text = Path(path).read_text(encoding="utf-8")
    lines = text.splitlines()

    in_table = False
    header_count = 0
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("|"):
            cells = [c.strip() for c in stripped.strip("|").split("|")]
            if not in_table:
                in_table = True
                header_count = len(cells)
                continue  # header row
            if all(set(cell).issubset({"-", ":", " "}) for cell in cells):
                continue  # separator row
            if len(cells) == header_count and cells[0].isdigit():
                yield cells
        else:
            in_table = False


def row_to_source(cells: list[str]) -> dict:
    # Expected columns:
    # # | 名称 | URL | 类型 | 语言 | 地区 | 分类 | 抓取间隔 | 状态 | quality_note
    status = cells[8].lower() if len(cells) > 8 else "active"
    return {
        "name": cells[1],
        "url": cells[2],
        "type": cells[3].lower() if cells[3] else "rss",
        "language": cells[4] or None,
        "region": cells[5] or None,
        "category": cells[6] or "general",
        "fetch_interval_minutes": parse_interval(cells[7]),
        "enabled": status != "disabled",
    }


def import_sources(db: Session, dry_run: bool = False) -> dict:
    rows = list(parse_markdown_tables(SOURCE_FILE))
    sources = [row_to_source(row) for row in rows]

    existing_by_url = {s.url: s for s in db.query(models.Source).all()}
    existing_by_name = {s.name: s for s in db.query(models.Source).all()}

    added = 0
    updated = 0
    skipped = 0
    for src in sources:
        existing = existing_by_url.get(src["url"]) or existing_by_name.get(src["name"])
        if existing:
            # Update enabled status and URL if the source definition changed.
            changed = False
            if existing.enabled != src["enabled"]:
                existing.enabled = src["enabled"]
                changed = True
            if existing.url != src["url"]:
                existing.url = src["url"]
                changed = True
            if changed and not dry_run:
                updated += 1
            else:
                skipped += 1
            continue
        if not dry_run:
            db.add(models.Source(**src))
        added += 1

    if not dry_run and (added > 0 or updated > 0):
        db.commit()

    return {"total_in_file": len(sources), "added": added, "updated": updated, "skipped": skipped}


def main() -> int:
    import argparse

    parser = argparse.ArgumentParser(description="Import real sources into NewsDesk")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be imported without making changes",
    )
    args = parser.parse_args()

    init_db()
    db = SessionLocal()
    try:
        result = import_sources(db, dry_run=args.dry_run)
        print(f"Sources in file: {result['total_in_file']}")
        print(f"Added: {result['added']}")
        print(f"Skipped (duplicate): {result['skipped']}")
        if args.dry_run:
            print("Dry-run: no changes made.")
    finally:
        db.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
