import sqlite3
import tempfile
from pathlib import Path

from sqlalchemy import create_engine

from app import models
from app.migrations import migrate


def _create_old_schema_db(path: str) -> None:
    """Create a database that mimics the pre-migration MVP schema."""
    conn = sqlite3.connect(path)
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS sources (
            id INTEGER PRIMARY KEY,
            name VARCHAR NOT NULL,
            url VARCHAR NOT NULL,
            type VARCHAR DEFAULT 'rss',
            category VARCHAR DEFAULT '',
            language VARCHAR,
            region VARCHAR,
            trust_level INTEGER DEFAULT 0,
            fetch_interval_minutes INTEGER DEFAULT 60,
            enabled BOOLEAN DEFAULT 1,
            error_count INTEGER DEFAULT 0,
            last_fetched_at DATETIME,
            last_success_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS articles (
            id INTEGER PRIMARY KEY,
            source_id INTEGER NOT NULL,
            title VARCHAR NOT NULL,
            url VARCHAR NOT NULL,
            author VARCHAR,
            published_at DATETIME,
            fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            summary_raw TEXT,
            summary_text TEXT,
            image_url VARCHAR
        );

        CREATE TABLE IF NOT EXISTS stories (
            id INTEGER PRIMARY KEY,
            canonical_title VARCHAR NOT NULL,
            short_title VARCHAR,
            summary TEXT,
            key_points TEXT,
            topics TEXT,
            entities TEXT,
            first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            source_count INTEGER DEFAULT 0,
            article_count INTEGER DEFAULT 0,
            heat_score FLOAT DEFAULT 0.0,
            status VARCHAR DEFAULT 'new'
        );

        CREATE TABLE IF NOT EXISTS story_article_links (
            id INTEGER PRIMARY KEY,
            story_id INTEGER NOT NULL,
            article_id INTEGER NOT NULL,
            relation VARCHAR DEFAULT 'primary',
            similarity_score FLOAT,
            linked_by VARCHAR DEFAULT 'rule',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS fetch_logs (
            id INTEGER PRIMARY KEY,
            source_id INTEGER NOT NULL,
            started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            ended_at DATETIME,
            status VARCHAR DEFAULT 'running',
            fetched_count INTEGER DEFAULT 0,
            new_count INTEGER DEFAULT 0,
            error_message TEXT
        );
        """
    )
    conn.commit()
    conn.close()


def test_migrate_adds_missing_columns():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "old.db"
        _create_old_schema_db(str(db_path))

        engine = create_engine(f"sqlite:///{db_path}")
        try:
            migrate(engine)

            # Verify new columns exist on stories.
            conn = sqlite3.connect(str(db_path))
            try:
                columns = {row[1] for row in conn.execute("PRAGMA table_info(stories)").fetchall()}
                assert "confidence" in columns
                assert "merge_reason" in columns
                assert "needs_review" in columns
                assert "importance_score" in columns

                # Verify story_ai_summaries table was created.
                tables = {
                    row[0]
                    for row in conn.execute(
                        "SELECT name FROM sqlite_master WHERE type='table'"
                    ).fetchall()
                }
                assert "story_ai_summaries" in tables
            finally:
                conn.close()
        finally:
            engine.dispose()


def test_migrate_is_idempotent():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "old.db"
        _create_old_schema_db(str(db_path))

        engine = create_engine(f"sqlite:///{db_path}")
        try:
            migrate(engine)
            migrate(engine)  # Should not raise.

            # Still works after second run.
            conn = sqlite3.connect(str(db_path))
            try:
                columns = {row[1] for row in conn.execute("PRAGMA table_info(stories)").fetchall()}
                assert "merge_reason" in columns
            finally:
                conn.close()
        finally:
            engine.dispose()


def test_migration_allows_story_query():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "old.db"
        _create_old_schema_db(str(db_path))

        engine = create_engine(f"sqlite:///{db_path}")
        try:
            migrate(engine)

            # Querying Story model should not fail.
            from sqlalchemy.orm import Session

            with Session(engine) as session:
                story = models.Story(canonical_title="Migrated Story")
                session.add(story)
                session.commit()
                assert story.id is not None
        finally:
            engine.dispose()
