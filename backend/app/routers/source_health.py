from datetime import timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import database, models, schemas
from ..utils.time import ensure_utc, utc_now

router = APIRouter(prefix="/source-health", tags=["source-health"])


BROKEN_THRESHOLD = 7
SILENT_HOURS = 48
NOISY_ARTICLES = 100
NOISY_STORIES = 10


def _classify_source(
    source: models.Source,
    article_count_24h: int,
    story_count_24h: int,
    duplicate_count_24h: int,
) -> str:
    if not source.enabled:
        return "disabled"
    if source.error_count >= BROKEN_THRESHOLD:
        return "broken"
    if source.last_success_at is None:
        # Never succeeded but has been fetched.
        if source.error_count > 0:
            return "broken"
        return "degraded"

    now = utc_now()
    last_success = ensure_utc(source.last_success_at)
    hours_since_success = (now - last_success).total_seconds() / 3600

    if hours_since_success > SILENT_HOURS:
        return "silent"
    if 1 <= source.error_count <= 3:
        return "degraded"
    if article_count_24h > NOISY_ARTICLES and story_count_24h < NOISY_STORIES:
        return "noisy"
    if hours_since_success <= 24:
        return "healthy"
    return "degraded"


@router.get("", response_model=List[schemas.SourceHealthRead])
def list_source_health(db: Session = Depends(database.get_db)):
    now = utc_now()
    since = now - timedelta(hours=24)

    sources = db.query(models.Source).order_by(models.Source.created_at.desc()).all()

    # Pre-compute per-source article counts in the last 24h.
    article_stats = {
        row.source_id: row
        for row in db.query(
            models.Article.source_id,
            func.count(models.Article.id).label("article_count"),
        )
        .filter(models.Article.fetched_at >= since)
        .group_by(models.Article.source_id)
        .all()
    }

    # Count distinct stories linked to each source's recent articles.
    story_stats = {
        row.source_id: row.story_count
        for row in db.query(
            models.Article.source_id,
            func.count(func.distinct(models.StoryArticleLink.story_id)).label("story_count"),
        )
        .join(models.StoryArticleLink, models.StoryArticleLink.article_id == models.Article.id)
        .filter(models.Article.fetched_at >= since)
        .group_by(models.Article.source_id)
        .all()
    }

    # Duplicates in the last 24h are approximated by the sum of
    # (fetched_count - new_count) from FetchLog entries. This reflects how
    # many articles the fetcher saw but skipped because they already existed.
    duplicate_stats = {
        row.source_id: row.duplicate_count
        for row in db.query(
            models.FetchLog.source_id,
            func.sum(models.FetchLog.fetched_count - models.FetchLog.new_count).label(
                "duplicate_count"
            ),
        )
        .filter(
            models.FetchLog.started_at >= since,
            models.FetchLog.status == "success",
        )
        .group_by(models.FetchLog.source_id)
        .all()
    }

    # Pre-fetch recent fetch logs for error summary and consecutive failures.
    recent_logs = (
        db.query(models.FetchLog)
        .filter(models.FetchLog.started_at >= since)
        .order_by(models.FetchLog.started_at.desc())
        .all()
    )
    logs_by_source: dict[int, list[models.FetchLog]] = {}
    for log in recent_logs:
        logs_by_source.setdefault(log.source_id, []).append(log)

    result = []
    for source in sources:
        article_count = getattr(article_stats.get(source.id), "article_count", 0) or 0
        story_count = story_stats.get(source.id, 0) or 0
        duplicate_count = duplicate_stats.get(source.id, 0) or 0

        status = _classify_source(source, article_count, story_count, duplicate_count)
        consecutive_failures, latest_error = _compute_failure_stats(source, logs_by_source.get(source.id, []))
        suggested_action = _suggest_action(status, source, consecutive_failures)

        result.append(
            {
                "id": source.id,
                "name": source.name,
                "url": source.url,
                "category": source.category,
                "enabled": source.enabled,
                "status": status,
                "last_fetched_at": source.last_fetched_at,
                "last_success_at": source.last_success_at,
                "error_count": source.error_count,
                "article_count_24h": article_count,
                "story_count_24h": story_count,
                "duplicate_count_24h": duplicate_count,
                "consecutive_failures": consecutive_failures,
                "latest_error": latest_error,
                "suggested_action": suggested_action,
            }
        )

    return result


def _compute_failure_stats(source: models.Source, logs: list[models.FetchLog]) -> tuple[int, Optional[str]]:
    """Count consecutive failures since last success and return the latest error message."""
    latest_error: Optional[str] = None
    for log in logs:
        if log.status != "success" and log.error_message:
            latest_error = log.error_message[:200]
            break

    if source.last_success_at is None:
        # All attempts are failures if error_count > 0.
        return source.error_count if source.error_count > 0 else 0, latest_error

    consecutive = 0
    last_success_time = ensure_utc(source.last_success_at)
    for log in logs:
        log_time = ensure_utc(log.started_at)
        if log_time <= last_success_time:
            break
        if log.status != "success":
            consecutive += 1
        else:
            break

    return consecutive, latest_error


def _suggest_action(status: str, source: models.Source, consecutive_failures: int) -> str:
    if status == "broken":
        return "检查 URL 是否有效；无效则替换或禁用该来源"
    if status == "silent":
        return "确认来源是否停止更新；长期 silent 可降低抓取频率或禁用"
    if status == "degraded":
        if consecutive_failures >= 3:
            return "连续失败次数较高，检查网络或站点反爬"
        return "观察下一轮抓取是否恢复"
    if status == "noisy":
        return "文章多但 Story 少，检查是否重复内容或低信噪比"
    if not source.enabled:
        return "已禁用，如需恢复请启用"
    return "保持健康，继续观察"
