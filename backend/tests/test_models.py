from datetime import datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import Base, Source, Article
from app.schemas import SourceRead


def test_create_source_and_article():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    source = Source(name="Test", type="rss", url="http://example.com/rss")
    db.add(source)
    db.commit()

    article = Article(
        source_id=source.id,
        title="Hello",
        url="http://example.com/a",
        canonical_url="http://example.com/a",
        hash_url="abc123",
        hash_title="abc123",
        hash_content="def456",
    )
    db.add(article)
    db.commit()

    assert article.source.name == "Test"
    db.close()


def test_source_read_validation_before_commit():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    source = Source(
        id=1,
        name="Test",
        url="http://example.com/rss",
        created_at=datetime.now(timezone.utc),
    )
    db.add(source)

    read_source = SourceRead.model_validate(source)
    assert read_source.type == "rss"
    assert read_source.category == "general"
    assert read_source.language == "zh"
    assert read_source.region == "CN"
    assert read_source.trust_level == 3
    assert read_source.fetch_interval_minutes == 60
    assert read_source.enabled is True
    assert read_source.error_count == 0
    assert read_source.last_fetched_at is None
    assert read_source.last_success_at is None

    db.commit()
    db.close()
