from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, field_validator


class SourceBase(BaseModel):
    name: str
    type: str = "rss"
    url: str
    category: str = "general"
    language: str = "zh"
    region: str = "CN"
    trust_level: int = 3
    fetch_interval_minutes: int = 60
    enabled: bool = True


class SourceCreate(SourceBase):
    pass


class SourceUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    url: Optional[str] = None
    category: Optional[str] = None
    language: Optional[str] = None
    region: Optional[str] = None
    trust_level: Optional[int] = None
    fetch_interval_minutes: Optional[int] = None
    enabled: Optional[bool] = None


class SourceRead(SourceBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str = "rss"
    category: str = "general"
    language: str = "zh"
    region: str = "CN"
    trust_level: int = 3
    fetch_interval_minutes: int = 60
    enabled: bool = True
    error_count: int = 0
    last_fetched_at: Optional[datetime] = None
    last_success_at: Optional[datetime] = None
    created_at: datetime

    @field_validator("*", mode="before")
    @classmethod
    def _set_default_if_none(cls, v, info):
        if v is None:
            field = cls.model_fields[info.field_name]
            if not field.is_required():
                return field.default
        return v


class SourceHealthRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    url: str
    category: str
    enabled: bool
    status: str
    last_fetched_at: Optional[datetime] = None
    last_success_at: Optional[datetime] = None
    error_count: int
    article_count_24h: int
    story_count_24h: int
    duplicate_count_24h: int
    consecutive_failures: int = 0
    latest_error: Optional[str] = None
    suggested_action: str = "observe"


class ArticleBase(BaseModel):
    source_id: int
    title: str
    url: str
    canonical_url: Optional[str] = None
    author: Optional[str] = None
    published_at: Optional[datetime] = None
    summary_raw: Optional[str] = None
    content_text: Optional[str] = None
    image_url: Optional[str] = None
    language: Optional[str] = None
    hash_content: Optional[str] = None


class ArticleRead(ArticleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    fetched_at: datetime
    hash_url: str
    hash_title: str
    status: str = "active"

    @field_validator("*", mode="before")
    @classmethod
    def _set_default_if_none(cls, v, info):
        if v is None:
            field = cls.model_fields[info.field_name]
            if not field.is_required():
                return field.default
        return v


class FetchLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source_id: int
    started_at: datetime
    ended_at: Optional[datetime] = None
    status: str = "running"
    fetched_count: int = 0
    new_count: int = 0
    error_message: Optional[str] = None

    @field_validator("*", mode="before")
    @classmethod
    def _set_default_if_none(cls, v, info):
        if v is None:
            field = cls.model_fields[info.field_name]
            if not field.is_required():
                return field.default
        return v


class WatchRuleBase(BaseModel):
    name: str
    keywords: str
    enabled: bool = True


class WatchRuleCreate(WatchRuleBase):
    pass


class WatchRuleUpdate(BaseModel):
    name: Optional[str] = None
    keywords: Optional[str] = None
    enabled: Optional[bool] = None


class WatchRuleRead(WatchRuleBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


class StoryBase(BaseModel):
    canonical_title: str
    short_title: Optional[str] = None
    summary: Optional[str] = None
    key_points: Optional[str] = None
    topics: Optional[str] = None
    entities: Optional[str] = None
    status: str = "new"


class StoryCreate(StoryBase):
    pass


class StoryArticleLinkRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    story_id: int
    article_id: int
    relation: str = "primary"
    similarity_score: Optional[float] = None
    linked_by: str = "rule"
    created_at: datetime

    @field_validator("*", mode="before")
    @classmethod
    def _set_default_if_none(cls, v, info):
        if v is None:
            field = cls.model_fields[info.field_name]
            if not field.is_required():
                return field.default
        return v


class StoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    canonical_title: str
    short_title: Optional[str] = None
    first_seen_at: datetime
    last_updated_at: datetime
    source_count: int
    article_count: int
    heat_score: float
    confidence: float
    merge_reason: Optional[str] = None
    needs_review: bool = False
    status: str
    article_ids: List[int] = []
    source_names: List[str] = []
    articles: List[ArticleRead] = []

    @field_validator("*", mode="before")
    @classmethod
    def _set_default_if_none(cls, v, info):
        if v is None:
            field = cls.model_fields[info.field_name]
            if not field.is_required():
                return field.default
        return v


class SystemStateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    paused: bool
    enabled_source_ids: List[int] = []


class BriefingItem(BaseModel):
    rank: int
    story_id: int
    title: str
    status: str
    heat_score: float
    source_count: int
    article_count: int
    top_source: Optional[str] = None


class BriefingRead(BaseModel):
    generated_at: datetime
    items: List[BriefingItem] = []
    plain_text: str
    ai_title: Optional[str] = None
    ai_intro: Optional[str] = None
    ai_items: Optional[List[dict]] = None
    model: Optional[str] = None


class StoryDiffItem(BaseModel):
    source_name: str
    article_id: int
    title: str
    summary: Optional[str] = None
    published_at: Optional[datetime] = None
    url: Optional[str] = None


class StoryDiffRead(BaseModel):
    story_id: int
    canonical_title: str
    sources: List[str]
    articles: List[StoryDiffItem]
    common_words: List[str] = []
    unique_phrases: List[str] = []
