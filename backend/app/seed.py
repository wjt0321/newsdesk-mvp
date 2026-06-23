from sqlalchemy.orm import Session

from . import models


SAMPLE_SOURCES = [
    {
        "name": "BBC Top Stories",
        "type": "rss",
        "url": "https://feeds.bbci.co.uk/news/rss.xml",
        "category": "global",
        "language": "en",
        "region": "UK",
    },
    {
        "name": "The Guardian World",
        "type": "rss",
        "url": "https://www.theguardian.com/world/rss",
        "category": "global",
        "language": "en",
        "region": "UK",
    },
    {
        "name": "Hacker News",
        "type": "rss",
        "url": "https://news.ycombinator.com/rss",
        "category": "tech",
        "language": "en",
        "region": "US",
    },
    {
        "name": "TechCrunch",
        "type": "rss",
        "url": "https://techcrunch.com/feed/",
        "category": "tech",
        "language": "en",
        "region": "US",
    },
    {
        "name": "NPR News",
        "type": "rss",
        "url": "https://feeds.npr.org/1001/rss.xml",
        "category": "global",
        "language": "en",
        "region": "US",
    },
]


def seed_sources(db: Session) -> None:
    existing = db.query(models.Source).count()
    if existing > 0:
        return
    for data in SAMPLE_SOURCES:
        db.add(models.Source(**data))
    db.commit()
