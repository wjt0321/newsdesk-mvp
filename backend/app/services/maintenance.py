from datetime import timedelta
from typing import Optional

from sqlalchemy.orm import Session

from .. import models
from ..utils.time import utc_now


def cleanup_old_articles(
    db: Session,
    days: int = 30,
    dry_run: bool = False,
) -> int:
    """Delete articles older than `days`.

    Returns the number of rows that would be or were deleted.
    """
    cutoff = utc_now() - timedelta(days=days)
    query = db.query(models.Article).filter(models.Article.fetched_at < cutoff)
    count = query.count()
    if not dry_run and count > 0:
        query.delete(synchronize_session=False)
        db.commit()
    return count


def cleanup_fetch_logs(
    db: Session,
    days: int = 30,
    dry_run: bool = False,
) -> int:
    """Delete fetch logs older than `days`.

    Returns the number of rows that would be or were deleted.
    """
    cutoff = utc_now() - timedelta(days=days)
    query = db.query(models.FetchLog).filter(models.FetchLog.started_at < cutoff)
    count = query.count()
    if not dry_run and count > 0:
        query.delete(synchronize_session=False)
        db.commit()
    return count


def cleanup_orphan_links(
    db: Session,
    dry_run: bool = False,
) -> dict[str, int]:
    """Delete story-article links whose article or story no longer exists.

    Also deletes stories that have no articles after link cleanup, and articles
    that have no source.

    Returns counts of removed links, stories, and articles.
    """
    # Links pointing to missing articles or stories.
    article_ids = db.query(models.Article.id)
    story_ids = db.query(models.Story.id)
    link_query = db.query(models.StoryArticleLink).filter(
        (~models.StoryArticleLink.article_id.in_(article_ids))
        | (~models.StoryArticleLink.story_id.in_(story_ids))
    )
    link_count = link_query.count()
    if not dry_run and link_count > 0:
        link_query.delete(synchronize_session=False)
        db.commit()

    # Stories with no articles.
    story_ids_with_articles = db.query(models.StoryArticleLink.story_id).distinct()
    story_query = db.query(models.Story).filter(~models.Story.id.in_(story_ids_with_articles))
    story_count = story_query.count()
    if not dry_run and story_count > 0:
        story_query.delete(synchronize_session=False)
        db.commit()

    # Articles with no source.
    source_ids = db.query(models.Source.id)
    article_query = db.query(models.Article).filter(~models.Article.source_id.in_(source_ids))
    article_count = article_query.count()
    if not dry_run and article_count > 0:
        article_query.delete(synchronize_session=False)
        db.commit()

    return {
        "links": link_count,
        "stories": story_count,
        "articles": article_count,
    }


def vacuum_database(db: Session) -> None:
    """Run VACUUM on the SQLite database to reclaim space."""
    db.execute("VACUUM")


def check_consistency(db: Session) -> dict[str, int]:
    """Return counts of inconsistent records for reporting."""
    article_ids = db.query(models.Article.id)
    story_ids = db.query(models.Story.id)
    orphan_links = db.query(models.StoryArticleLink).filter(
        (~models.StoryArticleLink.article_id.in_(article_ids))
        | (~models.StoryArticleLink.story_id.in_(story_ids))
    ).count()

    story_ids_with_articles = db.query(models.StoryArticleLink.story_id).distinct()
    stories_without_articles = db.query(models.Story).filter(
        ~models.Story.id.in_(story_ids_with_articles)
    ).count()

    source_ids = db.query(models.Source.id)
    articles_without_source = db.query(models.Article).filter(
        ~models.Article.source_id.in_(source_ids)
    ).count()

    return {
        "orphan_links": orphan_links,
        "stories_without_articles": stories_without_articles,
        "articles_without_source": articles_without_source,
    }
