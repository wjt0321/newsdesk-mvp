#!/usr/bin/env python3
"""Trigger a fetch for all enabled sources and record results.

Run from the project root with the backend virtual environment:

    cd newsdesk-mvp
    backend/.venv/Scripts/python scripts/fetch_all_sources.py
"""

import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Make `backend/app` importable and ensure relative DB path resolves to backend/data.
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

from sqlalchemy.orm import Session

from app import models
from app.database import init_db, SessionLocal
from app.services.fetcher import fetch_source


def fetch_all(db: Session) -> dict:
    sources = db.query(models.Source).filter(models.Source.enabled == True).all()  # noqa: E712
    total = len(sources)
    success = 0
    failed = 0
    results = []

    for source in sources:
        try:
            log = fetch_source(db, source)
            db.commit()
            if log and log.status == "success":
                success += 1
                results.append({
                    "id": source.id,
                    "name": source.name,
                    "status": "success",
                    "fetched": log.fetched_count,
                    "new": log.new_count,
                })
            else:
                failed += 1
                results.append({
                    "id": source.id,
                    "name": source.name,
                    "status": log.status if log else "unknown",
                    "fetched": log.fetched_count if log else 0,
                    "new": log.new_count if log else 0,
                })
        except Exception as exc:
            failed += 1
            db.rollback()
            results.append({
                "id": source.id,
                "name": source.name,
                "status": "error",
                "error": str(exc),
            })

    return {"total": total, "success": success, "failed": failed, "results": results}


def main() -> int:
    import argparse

    parser = argparse.ArgumentParser(description="Fetch all enabled sources")
    parser.add_argument(
        "--report",
        action="store_true",
        default=True,
        help="Write a Markdown report to reports/",
    )
    args = parser.parse_args()

    init_db()
    db = SessionLocal()
    try:
        summary = fetch_all(db)
        print(f"Total sources: {summary['total']}")
        print(f"Success: {summary['success']}")
        print(f"Failed: {summary['failed']}")

        if args.report:
            lines = [
                "# NewsDesk 全源抓取报告",
                "",
                f"> 时间：{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}",
                "",
                f"- 总来源：{summary['total']}",
                f"- 成功：{summary['success']}",
                f"- 失败：{summary['failed']}",
                "",
                "## 结果明细",
                "",
                "| 名称 | 状态 | 抓取 | 新增 | 错误 |",
                "|---|---|---|---|---|",
            ]
            for r in summary["results"]:
                lines.append(
                    f"| {r['name']} | {r['status']} | {r.get('fetched', '-')} | "
                    f"{r.get('new', '-')} | {r.get('error', '')} |"
                )

            reports_dir = Path(PROJECT_ROOT) / "reports"
            reports_dir.mkdir(exist_ok=True)
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
            output_path = reports_dir / f"{timestamp}-fetch-all-report.md"
            output_path.write_text("\n".join(lines), encoding="utf-8")
            print(f"Report written to {output_path}")
    finally:
        db.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
