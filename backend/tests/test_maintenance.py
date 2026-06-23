from datetime import timedelta

from app import models
from app.services.maintenance import (
    check_consistency,
    cleanup_fetch_logs,
    cleanup_old_articles,
    cleanup_orphan_links,
)
from app.utils.time import utc_now


def test_cleanup_old_articles_dry_run(db):
    source = models.Source(name="Old Source", url="http://example.com/old")
    db.add(source)
    db.commit()

    old_article = models.Article(
        source_id=source.id,
        title="Old Article",
        url="http://example.com/old/1",
        canonical_url="http://example.com/old/1",
        hash_url="old1",
        hash_title="old1",
        fetched_at=utc_now() - timedelta(days=60),
    )
    db.add(old_article)
    db.commit()

    count = cleanup_old_articles(db, days=30, dry_run=True)
    assert count == 1
    assert db.query(models.Article).filter_by(id=old_article.id).count() == 1


def test_cleanup_old_articles_actual(db):
    source = models.Source(name="Old Source", url="http://example.com/old")
    db.add(source)
    db.commit()

    old_article = models.Article(
        source_id=source.id,
        title="Old Article",
        url="http://example.com/old/1",
        canonical_url="http://example.com/old/1",
        hash_url="old1",
        hash_title="old1",
        fetched_at=utc_now() - timedelta(days=60),
    )
    db.add(old_article)
    db.commit()
    article_id = old_article.id

    count = cleanup_old_articles(db, days=30, dry_run=False)
    assert count == 1
    assert db.query(models.Article).filter_by(id=article_id).count() == 0


def test_cleanup_fetch_logs(db):
    source = models.Source(name="Log Source", url="http://example.com/log")
    db.add(source)
    db.commit()

    old_log = models.FetchLog(
        source_id=source.id,
        started_at=utc_now() - timedelta(days=60),
        status="success",
    )
    db.add(old_log)
    db.commit()
    log_id = old_log.id

    count = cleanup_fetch_logs(db, days=30, dry_run=False)
    assert count == 1
    assert db.query(models.FetchLog).filter_by(id=log_id).count() == 0


def test_cleanup_orphan_links(db):
    source = models.Source(name="Orphan Source", url="http://example.com/orphan")
    db.add(source)
    db.commit()

    article = models.Article(
        source_id=source.id,
        title="Article",
        url="http://example.com/orphan/1",
        canonical_url="http://example.com/orphan/1",
        hash_url="orphan1",
        hash_title="orphan1",
    )
    db.add(article)
    db.commit()

    # Create a story and link it to the article.
    story = models.Story(canonical_title="Story")
    db.add(story)
    db.commit()

    link = models.StoryArticleLink(story_id=story.id, article_id=article.id)
    db.add(link)
    db.commit()

    # Create a story with no articles (should be cleaned up).
    empty_story = models.Story(canonical_title="Empty Story")
    db.add(empty_story)
    db.commit()
    empty_story_id = empty_story.id

    counts = cleanup_orphan_links(db, dry_run=False)
    assert counts["stories"] == 1
    assert db.query(models.Story).filter_by(id=empty_story_id).count() == 0
    # The valid link and article/story should remain.
    assert db.query(models.StoryArticleLink).filter_by(id=link.id).count() == 1


def test_check_consistency(db):
    source = models.Source(name="Consistent Source", url="http://example.com/cons")
    db.add(source)
    db.commit()

    article = models.Article(
        source_id=source.id,
        title="Article",
        url="http://example.com/cons/1",
        canonical_url="http://example.com/cons/1",
        hash_url="cons1",
        hash_title="cons1",
    )
    db.add(article)
    db.commit()

    result = check_consistency(db)
    assert result["orphan_links"] == 0
    assert result["stories_without_articles"] == 0
    assert result["articles_without_source"] == 0
