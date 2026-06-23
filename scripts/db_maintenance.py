#!/usr/bin/env python3
"""Database maintenance script for NewsDesk MVP.

Runs cleanup, consistency checks, and VACUUM. Run from the project root with
the backend virtual environment:

    cd newsdesk-mvp
    backend/.venv/Scripts/python scripts/db_maintenance.py --days 30
"""

import argparse
import os
import shutil
import sys
from pathlib import Path

# Make `backend/app` importable and ensure relative DB path resolves to backend/data.
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

from app.database import SessionLocal, engine, init_db
from app.services.maintenance import (
    check_consistency,
    cleanup_fetch_logs,
    cleanup_old_articles,
    cleanup_orphan_links,
    vacuum_database,
)
from app.utils.time import utc_now


def _db_file_path() -> Path:
    """Resolve the SQLite file path from the SQLAlchemy engine URL."""
    db_path = engine.url.database or "./data/newsdesk.db"
    return Path(db_path).resolve()


def _backup_db(db_path: Path) -> Path:
    timestamp = utc_now().strftime("%Y%m%d-%H%M%S")
    backup_path = db_path.with_suffix(f".db.bak-{timestamp}")
    shutil.copy2(db_path, backup_path)
    return backup_path


def main() -> int:
    parser = argparse.ArgumentParser(description="NewsDesk database maintenance")
    parser.add_argument(
        "--days",
        type=int,
        default=30,
        help="Retention window in days for articles and fetch logs (default: 30)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be deleted without making changes",
    )
    parser.add_argument(
        "--skip-vacuum",
        action="store_true",
        help="Skip running VACUUM",
    )
    parser.add_argument(
        "--backup",
        action="store_true",
        default=True,
        help="Backup the database before actual cleanup (default: True)",
    )
    parser.add_argument(
        "--no-backup",
        action="store_true",
        help="Skip the pre-cleanup database backup",
    )
    args = parser.parse_args()

    do_backup = args.backup and not args.no_backup
    db_path = _db_file_path()

    init_db()
    db = SessionLocal()

    try:
        db_size_before = db_path.stat().st_size if db_path.exists() else 0
        articles = cleanup_old_articles(db, days=args.days, dry_run=args.dry_run)
        logs = cleanup_fetch_logs(db, days=args.days, dry_run=args.dry_run)
        orphans = cleanup_orphan_links(db, dry_run=args.dry_run)
        consistency = check_consistency(db)

        backup_path: Path | None = None
        if not args.dry_run and do_backup:
            backup_path = _backup_db(db_path)

        if not args.dry_run and not args.skip_vacuum:
            vacuum_database(db)

        db_size_after = db_path.stat().st_size if db_path.exists() else 0

        lines = [
            f"# NewsDesk 数据库维护报告",
            "",
            f"> 时间：{utc_now().strftime('%Y-%m-%d %H:%M:%S UTC')}  ",
            f"> 模式：{'dry-run' if args.dry_run else '实际执行'}  ",
            f"> 保留天数：{args.days}  ",
            f"> 数据库路径：`{db_path}`",
            "",
            "## 数据库信息",
            "",
            f"- 清理前大小：{db_size_before / 1024:.1f} KB",
            f"- 清理后大小：{db_size_after / 1024:.1f} KB",
        ]
        if backup_path:
            lines.append(f"- 备份路径：`{backup_path}`")
        elif not args.dry_run and not do_backup:
            lines.append("- 备份：已跳过（--no-backup）")
        else:
            lines.append("- 备份：dry-run 模式下不创建")

        lines.extend(
            [
                "",
                "## 清理结果",
                "",
                f"- 待删除文章：{articles}",
                f"- 待删除抓取日志：{logs}",
                f"- 孤儿 link：{orphans['links']}",
                f"- 无文章 story：{orphans['stories']}",
                f"- 无来源 article：{orphans['articles']}",
                "",
                "## 一致性检查",
                "",
                f"- 孤儿 link：{consistency['orphan_links']}",
                f"- 无文章 story：{consistency['stories_without_articles']}",
                f"- 无来源 article：{consistency['articles_without_source']}",
                "",
                f"## VACUUM\n\n{'已执行' if not args.dry_run and not args.skip_vacuum else '已跳过'}",
                "",
            ]
        )

        reports_dir = Path(PROJECT_ROOT) / "reports"
        reports_dir.mkdir(exist_ok=True)
        timestamp = utc_now().strftime("%Y%m%d-%H%M%S")
        output_path = reports_dir / f"{timestamp}-db-maintenance.md"
        output_path.write_text("\n".join(lines), encoding="utf-8")

        print(f"DB path: {db_path}")
        print(f"DB size before: {db_size_before / 1024:.1f} KB")
        print(f"DB size after: {db_size_after / 1024:.1f} KB")
        if backup_path:
            print(f"Backup created: {backup_path}")
        print(f"Articles to clean: {articles}")
        print(f"Fetch logs to clean: {logs}")
        print(f"Orphan links: {orphans['links']}")
        print(f"Stories without articles: {orphans['stories']}")
        print(f"Articles without source: {orphans['articles']}")
        print(f"Report written to {output_path}")
    finally:
        db.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
