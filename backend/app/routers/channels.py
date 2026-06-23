import re
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from .. import database, models, schemas
from ..services.story_serializer import story_to_read

router = APIRouter(prefix="/channels", tags=["channels"])

CHANNELS = [
    {"id": "domestic", "name": "国内", "keywords": ["中国", "国内", "北京", "上海"]},
    {"id": "global", "name": "国际", "keywords": ["国际", "world", "global", "us", "uk", "eu"]},
    {"id": "finance", "name": "财经", "keywords": ["财经", "金融", "股市", "经济", "finance", "market"]},
    {"id": "tech", "name": "科技", "keywords": ["科技", "tech", "互联网", "软件", "芯片"]},
    {"id": "ai", "name": "AI", "keywords": ["AI", "人工智能", "OpenAI", "模型", "LLM"]},
    {"id": "policy", "name": "政策监管", "keywords": ["政策", "监管", "法规", "政府"]},
    {"id": "company", "name": "公司动态", "keywords": ["公司", "企业", "财报", "收购", "上市"]},
    {"id": "market", "name": "市场", "keywords": ["市场", "行情", "交易", "期货"]},
    {"id": "security", "name": "安全风险", "keywords": ["安全", "风险", "黑客", "漏洞", "网络攻击"]},
]


@router.get("")
def list_channels():
    return [{"id": c["id"], "name": c["name"]} for c in CHANNELS]


@router.get("/{channel_id}/stories", response_model=List[schemas.StoryRead])
def list_channel_stories(
    channel_id: str,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(database.get_db),
):
    channel = next((c for c in CHANNELS if c["id"] == channel_id), None)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    keywords = [k.lower() for k in channel["keywords"]]
    stories = (
        db.query(models.Story)
        .options(
            joinedload(models.Story.article_links)
            .joinedload(models.StoryArticleLink.article)
            .joinedload(models.Article.source)
        )
        .order_by(models.Story.last_updated_at.desc())
        .limit(limit * 3)
        .all()
    )
    matched = []
    for story in stories:
        text = f"{story.canonical_title or ''} {story.short_title or ''}".lower()
        if any(_keyword_matches(k, text) for k in keywords):
            matched.append(story)
        if len(matched) >= limit:
            break
    return [story_to_read(s) for s in matched]


def _keyword_matches(keyword: str, text: str) -> bool:
    """Match keyword as a whole word for ASCII tokens, substring for CJK tokens."""
    if not keyword:
        return False
    # Treat pure-ASCII keywords as whole words to avoid false positives like
    # "us" matching "customer" or "market" matching "supermarket".
    if keyword.isascii():
        return bool(re.search(rf"\b{re.escape(keyword)}\b", text))
    return keyword in text
