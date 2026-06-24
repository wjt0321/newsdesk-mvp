from app import models
from app.curated_sources import CURATED_SOURCES
from app.seed import seed_sources


def test_seed_sources_populates_curated_catalog(db):
    seed_sources(db)

    sources = db.query(models.Source).all()

    assert len(sources) == len(CURATED_SOURCES)
    assert db.query(models.Source).filter(models.Source.name == "TechCrunch").one()
    assert db.query(models.Source).filter(models.Source.name == "人民日报").one()


def test_seed_sources_backfills_existing_sample_only_database(db):
    db.add(
        models.Source(
            name="TechCrunch",
            type="rss",
            url="https://techcrunch.com/feed/",
            category="tech",
            language="en",
            region="US",
            enabled=True,
        )
    )
    db.add(
        models.Source(
            name="NPR News",
            type="rss",
            url="https://feeds.npr.org/1001/rss.xml",
            category="global",
            language="en",
            region="US",
            enabled=True,
        )
    )
    db.commit()

    seed_sources(db)
    seed_sources(db)

    assert db.query(models.Source).count() == len(CURATED_SOURCES)
    assert db.query(models.Source).filter(models.Source.name == "TechCrunch").count() == 1
    assert db.query(models.Source).filter(models.Source.name == "NPR News").count() == 1
    assert db.query(models.Source).filter(models.Source.name == "人民日报").count() == 1
