from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Source(Base):
    __tablename__ = "sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, default="rss", nullable=False)
    url = Column(String, nullable=False)
    category = Column(String, default="general")
    language = Column(String, default="zh")
    region = Column(String, default="CN")
    trust_level = Column(Integer, default=3)
    fetch_interval_minutes = Column(Integer, default=60)
    enabled = Column(Boolean, default=True)
    last_fetched_at = Column(DateTime, nullable=True)
    last_success_at = Column(DateTime, nullable=True)
    error_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    articles = relationship(
        "Article",
        order_by="Article.id",
        back_populates="source",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    fetch_logs = relationship(
        "FetchLog",
        order_by="FetchLog.id",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("sources.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    url = Column(String, nullable=False)
    canonical_url = Column(String, nullable=True, index=True)
    author = Column(String, nullable=True)
    published_at = Column(DateTime, nullable=True, index=True)
    fetched_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    summary_raw = Column(Text, nullable=True)
    content_text = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    language = Column(String, nullable=True)
    hash_url = Column(String, index=True, unique=True, nullable=False)
    hash_title = Column(String, index=True, nullable=False)
    hash_content = Column(String, index=True, nullable=True)
    status = Column(String, default="active")

    source = relationship("Source", back_populates="articles")
    story_links = relationship(
        "StoryArticleLink",
        back_populates="article",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class FetchLog(Base):
    __tablename__ = "fetch_logs"

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("sources.id", ondelete="CASCADE"), nullable=False)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    ended_at = Column(DateTime, nullable=True)
    status = Column(String, default="running")
    fetched_count = Column(Integer, default=0)
    new_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)

    __table_args__ = (Index("idx_fetch_logs_source_started", "source_id", "started_at"),)


class WatchRule(Base):
    __tablename__ = "watch_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    keywords = Column(String, nullable=False)  # comma-separated
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Story(Base):
    __tablename__ = "stories"

    id = Column(Integer, primary_key=True, index=True)
    canonical_title = Column(String, nullable=False)
    short_title = Column(String, nullable=True)
    summary = Column(Text, nullable=True)
    key_points = Column(Text, nullable=True)
    topics = Column(String, nullable=True)
    entities = Column(String, nullable=True)
    first_seen_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        index=True,
    )
    source_count = Column(Integer, default=0)
    article_count = Column(Integer, default=0)
    heat_score = Column(Float, default=0.0, index=True)
    importance_score = Column(Float, default=0.0)
    confidence = Column(Float, default=0.0)
    merge_reason = Column(String, nullable=True)
    needs_review = Column(Boolean, default=False)
    status = Column(String, default="new")

    article_links = relationship(
        "StoryArticleLink",
        back_populates="story",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class StoryArticleLink(Base):
    __tablename__ = "story_article_links"

    id = Column(Integer, primary_key=True, index=True)
    story_id = Column(Integer, ForeignKey("stories.id", ondelete="CASCADE"), nullable=False, index=True)
    article_id = Column(Integer, ForeignKey("articles.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    relation = Column(String, default="primary")
    similarity_score = Column(Float, nullable=True)
    linked_by = Column(String, default="rule")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    story = relationship("Story", back_populates="article_links")
    article = relationship("Article", back_populates="story_links")


class StoryAISummary(Base):
    __tablename__ = "story_ai_summaries"

    id = Column(Integer, primary_key=True, index=True)
    story_id = Column(Integer, ForeignKey("stories.id", ondelete="CASCADE"), nullable=False, index=True)
    model = Column(String, nullable=False)
    summary = Column(Text, nullable=True)
    key_points_json = Column(Text, nullable=True)
    differences_json = Column(Text, nullable=True)
    generated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    source_fingerprint = Column(String, nullable=True, index=True)
    token_cost = Column(Integer, nullable=True)
    status = Column(String, default="success")


class SystemState(Base):
    __tablename__ = "system_state"

    id = Column(Integer, primary_key=True)
    paused = Column(Boolean, default=False)
    enabled_source_ids = Column(Text, default="[]")  # JSON list of ints
