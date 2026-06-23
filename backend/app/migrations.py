"""Lightweight SQLite migrations for NewsDesk MVP.

SQLAlchemy's `create_all()` only creates missing tables; it does not add columns
or indexes to existing tables. This module inspects the live SQLite database and
applies additive, idempotent migrations so existing `backend/data/newsdesk.db`
files continue to work after model changes.

Rules:
- Only additive changes (new columns, new tables, new indexes).
- Migrations are idempotent: repeated runs are safe.
- New columns always have a default value to avoid NOT NULL issues.
- Backups are the caller's responsibility.
"""

from sqlalchemy import Connection, text
from sqlalchemy.engine import Engine

from . import models


def _table_exists(conn: Connection, table_name: str) -> bool:
    result = conn.execute(
        text("SELECT name FROM sqlite_master WHERE type='table' AND name=:name"),
        {"name": table_name},
    ).scalar()
    return result is not None


def _column_exists(conn: Connection, table_name: str, column_name: str) -> bool:
    rows = conn.execute(text(f"PRAGMA table_info({table_name})")).fetchall()
    return any(row[1] == column_name for row in rows)


def _index_exists(conn: Connection, index_name: str) -> bool:
    result = conn.execute(
        text("SELECT name FROM sqlite_master WHERE type='index' AND name=:name"),
        {"name": index_name},
    ).scalar()
    return result is not None


def _add_column(
    conn: Connection,
    table_name: str,
    column_name: str,
    column_def: str,
) -> None:
    if _column_exists(conn, table_name, column_name):
        return
    conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_def}"))


def migrate(engine: Engine) -> None:
    """Run all additive migrations. Safe to call multiple times."""
    with engine.begin() as conn:
        # ------------------------------------------------------------------
        # Ensure all tables exist first (SQLAlchemy create_all handles this,
        # but we keep the call here for standalone usage).
        # ------------------------------------------------------------------
        models.Base.metadata.create_all(bind=engine)

        # ------------------------------------------------------------------
        # stories table: columns added after initial MVP schema.
        # ------------------------------------------------------------------
        if _table_exists(conn, "stories"):
            _add_column(conn, "stories", "importance_score", "FLOAT DEFAULT 0.0")
            _add_column(conn, "stories", "confidence", "FLOAT DEFAULT 0.0")
            _add_column(conn, "stories", "merge_reason", "VARCHAR")
            _add_column(conn, "stories", "needs_review", "BOOLEAN DEFAULT 0")
            _add_column(conn, "stories", "last_updated_at", "DATETIME")
            _add_column(conn, "stories", "heat_score", "FLOAT DEFAULT 0.0")

        # ------------------------------------------------------------------
        # articles table: indexes/columns added after initial MVP schema.
        # ------------------------------------------------------------------
        if _table_exists(conn, "articles"):
            _add_column(conn, "articles", "published_at", "DATETIME")
            _add_column(conn, "articles", "fetched_at", "DATETIME DEFAULT CURRENT_TIMESTAMP")
            _add_column(conn, "articles", "canonical_url", "VARCHAR")
            _add_column(conn, "articles", "status", "VARCHAR DEFAULT 'active'")
            _add_column(conn, "articles", "hash_url", "VARCHAR")
            _add_column(conn, "articles", "hash_title", "VARCHAR")

        # ------------------------------------------------------------------
        # Add missing indexes for performance.
        # ------------------------------------------------------------------
        if _table_exists(conn, "stories") and not _index_exists(conn, "idx_stories_last_updated_at"):
            conn.execute(text("CREATE INDEX idx_stories_last_updated_at ON stories(last_updated_at)"))
        if _table_exists(conn, "stories") and not _index_exists(conn, "idx_stories_heat_score"):
            conn.execute(text("CREATE INDEX idx_stories_heat_score ON stories(heat_score)"))
        if _table_exists(conn, "articles") and not _index_exists(conn, "idx_articles_published_at"):
            conn.execute(text("CREATE INDEX idx_articles_published_at ON articles(published_at)"))
        if _table_exists(conn, "articles") and not _index_exists(conn, "idx_articles_fetched_at"):
            conn.execute(text("CREATE INDEX idx_articles_fetched_at ON articles(fetched_at)"))
        if _table_exists(conn, "fetch_logs") and not _index_exists(conn, "idx_fetch_logs_source_started"):
            conn.execute(
                text("CREATE INDEX idx_fetch_logs_source_started ON fetch_logs(source_id, started_at)")
            )

        # NOTE: This module currently only supports additive migrations. If a
        # future change requires renaming or dropping columns/tables, introduce
        # a migration version table, backup the database, and use a full
        # migration framework or manual rebuild script.
