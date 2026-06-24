"""Import the curated 38-source list into the NewsDesk SQLite database.

Usage:
    python scripts/import_curated_sources.py [--clear]

Use ``--clear`` to wipe existing sources, articles, stories and fetch logs before
importing.  Without the flag the script only skips duplicate URLs and imports
missing sources.
"""

from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass

# Allow importing app.* when running from backend/scripts
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text

from app import database, models
from app.services.fetcher import fetch_source


@dataclass
class SourceDef:
    name: str
    url: str
    category: str
    source_type: str
    language: str
    region: str
    fetch_interval_minutes: int = 30
    trust_level: int = 4


CURATED: list[SourceDef] = [
    # 国内时政
    SourceDef(
        "人民日报",
        "http://www.people.com.cn/rss/politics.xml",
        "国内时政",
        "rss",
        "zh-CN",
        "CN",
        60,
    ),
    SourceDef(
        "凤凰网",
        "https://rsshub.ddns.net/ifeng/news",
        "国内时政",
        "rsshub",
        "zh-CN",
        "CN",
        30,
    ),
    SourceDef(
        "观察者网",
        "https://rsshub.ddns.net/guancha",
        "国内时政",
        "rsshub",
        "zh-CN",
        "CN",
        30,
    ),
    SourceDef(
        "观察者热点",
        "https://rsshub.ddns.net/guancha/redian",
        "国内时政",
        "rsshub",
        "zh-CN",
        "CN",
        30,
    ),
    SourceDef(
        "网易今日关注",
        "https://rsshub.ddns.net/163/today",
        "国内综合",
        "rsshub",
        "zh-CN",
        "CN",
        30,
    ),
    # 国内财经
    SourceDef(
        "财新最新",
        "https://rsshub.ddns.net/caixin/latest",
        "国内财经",
        "rsshub",
        "zh-CN",
        "CN",
        30,
    ),
    SourceDef(
        "第一财经",
        "https://rsshub.ddns.net/yicai/news",
        "国内财经",
        "rsshub",
        "zh-CN",
        "CN",
        30,
    ),
    SourceDef(
        "华尔街见闻 - 中国",
        "https://rsshub.ddns.net/wallstreetcn/news/china",
        "国内财经",
        "rsshub",
        "zh-CN",
        "CN",
        30,
    ),
    SourceDef(
        "华尔街见闻 - 全球",
        "https://rsshub.ddns.net/wallstreetcn/news/global",
        "国际财经",
        "rsshub",
        "zh-CN",
        "CN",
        30,
    ),
    # 国内科技 / AI
    SourceDef(
        "36氪快讯",
        "https://rsshub.ddns.net/36kr/newsflashes",
        "国内科技",
        "rsshub",
        "zh-CN",
        "CN",
        30,
    ),
    SourceDef(
        "36氪资讯",
        "https://rsshub.ddns.net/36kr/information/web_news",
        "国内科技",
        "rsshub",
        "zh-CN",
        "CN",
        30,
    ),
    SourceDef(
        "虎嗅",
        "https://rsshub.ddns.net/huxiu/article",
        "国内科技",
        "rsshub",
        "zh-CN",
        "CN",
        30,
    ),
    SourceDef(
        "少数派",
        "https://rsshub.ddns.net/sspai/index",
        "国内科技",
        "rsshub",
        "zh-CN",
        "CN",
        30,
    ),
    SourceDef(
        "少数派 Matrix",
        "https://rsshub.ddns.net/sspai/matrix",
        "国内科技",
        "rsshub",
        "zh-CN",
        "CN",
        30,
    ),
    SourceDef(
        "掘金周榜",
        "https://rsshub.ddns.net/juejin/trending/all/weekly",
        "国内科技",
        "rsshub",
        "zh-CN",
        "CN",
        60,
    ),
    SourceDef(
        "IT之家 24h",
        "https://rsshub.ddns.net/ithome/ranking/24h",
        "国内科技",
        "rsshub",
        "zh-CN",
        "CN",
        30,
    ),
    SourceDef(
        "雷峰网",
        "https://rsshub.ddns.net/leiphone",
        "国内AI",
        "rsshub",
        "zh-CN",
        "CN",
        30,
    ),
    SourceDef(
        "Solidot",
        "https://rsshub.ddns.net/solidot/www",
        "国内科技",
        "rsshub",
        "zh-CN",
        "CN",
        30,
    ),
    # 国内综合
    SourceDef(
        "知乎热榜",
        "https://rsshub.ddns.net/zhihu/hot",
        "国内综合",
        "rsshub",
        "zh-CN",
        "CN",
        15,
    ),
    # 国际综合
    SourceDef(
        "BBC 中文",
        "https://rsshub.ddns.net/bbc/chinese",
        "国际综合",
        "rsshub",
        "zh-CN",
        "UK",
        30,
    ),
    SourceDef(
        "AP Top News",
        "https://rsshub.ddns.net/apnews/topics/ap-top-news",
        "国际综合",
        "rsshub",
        "en",
        "US",
        30,
    ),
    SourceDef(
        "NPR News",
        "https://feeds.npr.org/1001/rss.xml",
        "国际综合",
        "rss",
        "en",
        "US",
        30,
    ),
    # 国际科技
    SourceDef(
        "TechCrunch",
        "https://techcrunch.com/feed/",
        "国际科技",
        "rss",
        "en",
        "US",
        30,
    ),
    SourceDef(
        "The Verge",
        "https://www.theverge.com/rss/index.xml",
        "国际科技",
        "rss",
        "en",
        "US",
        30,
    ),
    SourceDef(
        "Ars Technica",
        "https://arstechnica.com/feed/",
        "国际科技",
        "rss",
        "en",
        "US",
        30,
    ),
    SourceDef(
        "Wired",
        "https://www.wired.com/feed/rss",
        "国际科技",
        "rss",
        "en",
        "US",
        60,
    ),
    SourceDef(
        "MIT Technology Review",
        "https://www.technologyreview.com/feed/",
        "国际科技",
        "rss",
        "en",
        "US",
        60,
    ),
    SourceDef(
        "Engadget",
        "https://www.engadget.com/rss.xml",
        "国际科技",
        "rss",
        "en",
        "US",
        30,
    ),
    SourceDef(
        "CNET",
        "https://www.cnet.com/rss/news/",
        "国际科技",
        "rss",
        "en",
        "US",
        30,
    ),
    SourceDef(
        "VentureBeat",
        "https://venturebeat.com/feed/",
        "国际科技",
        "rss",
        "en",
        "US",
        30,
    ),
    SourceDef(
        "Hacker News",
        "https://rsshub.ddns.net/hackernews",
        "国际科技",
        "rsshub",
        "en",
        "US",
        15,
    ),
    SourceDef(
        "Google AI Blog",
        "https://blog.google/technology/ai/rss/",
        "国际AI",
        "rss",
        "en",
        "US",
        60,
    ),
    # 游戏
    SourceDef(
        "IGN",
        "https://www.ign.com/rss/articles/feed",
        "游戏",
        "rss",
        "en",
        "US",
        30,
    ),
    SourceDef(
        "GameSpot",
        "https://www.gamespot.com/feeds/news/",
        "游戏",
        "rss",
        "en",
        "US",
        30,
    ),
    SourceDef(
        "Eurogamer",
        "https://www.eurogamer.net/?format=rss",
        "游戏",
        "rss",
        "en",
        "UK",
        30,
    ),
    SourceDef(
        "PC Gamer",
        "https://www.pcgamer.com/rss/",
        "游戏",
        "rss",
        "en",
        "US",
        30,
    ),
    # 科学
    SourceDef(
        "Nature News",
        "https://www.nature.com/nature.rss",
        "科学",
        "rss",
        "en",
        "UK",
        60,
    ),
    # 视频/文化
    SourceDef(
        "Bilibili 热门",
        "https://rsshub.ddns.net/bilibili/popular/all",
        "视频/文化",
        "rsshub",
        "zh-CN",
        "CN",
        30,
    ),
    SourceDef(
        "豆瓣即将上映",
        "https://rsshub.ddns.net/douban/movie/later",
        "视频/文化",
        "rsshub",
        "zh-CN",
        "CN",
        60,
    ),
]


def import_sources(db, clear: bool = False) -> list[models.Source]:
    """Insert curated sources, optionally clearing old data first."""
    if clear:
        # Clear dependent tables first to avoid FK issues.
        db.execute(text("DELETE FROM story_article_links"))
        db.execute(text("DELETE FROM story_ai_summaries"))
        db.execute(text("DELETE FROM stories"))
        db.execute(text("DELETE FROM articles"))
        db.execute(text("DELETE FROM fetch_logs"))
        db.execute(text("DELETE FROM sources"))
        db.commit()
        print("Cleared existing sources, articles, stories, and fetch logs.")

    created: list[models.Source] = []
    for s in CURATED:
        existing = db.query(models.Source).filter(models.Source.url == s.url).first()
        if existing:
            print(f"Skipping duplicate: {s.name}")
            continue
        source = models.Source(
            name=s.name,
            type=s.source_type,
            url=s.url,
            category=s.category,
            language=s.language,
            region=s.region,
            trust_level=s.trust_level,
            fetch_interval_minutes=s.fetch_interval_minutes,
            enabled=True,
        )
        db.add(source)
        created.append(source)
    db.commit()
    for source in created:
        db.refresh(source)
    return created


def run_fetch_pass(db, sources: list[models.Source]) -> dict:
    """Fetch every source once and report results."""
    ok = 0
    failed = 0
    total_new = 0
    total_fetched = 0
    failed_names: list[str] = []
    for source in sources:
        try:
            log = fetch_source(db, source)
            if log.status == "success":
                ok += 1
                total_fetched += log.fetched_count or 0
                total_new += log.new_count or 0
            else:
                failed += 1
                failed_names.append(f"{source.name}: {log.error_message}")
        except Exception as exc:
            failed += 1
            failed_names.append(f"{source.name}: {exc}")
    return {
        "ok": ok,
        "failed": failed,
        "total_fetched": total_fetched,
        "total_new": total_new,
        "failed_names": failed_names,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--clear", action="store_true", help="Wipe existing data before import"
    )
    parser.add_argument(
        "--skip-fetch", action="store_true", help="Only import, do not fetch"
    )
    args = parser.parse_args()

    db = database.SessionLocal()
    try:
        sources = import_sources(db, clear=args.clear)
        print(f"Imported {len(sources)} sources.")
        if not args.skip_fetch:
            stats = run_fetch_pass(db, sources)
            print(f"Fetch pass: {stats['ok']} OK, {stats['failed']} failed")
            print(
                f"Articles fetched: {stats['total_fetched']}, "
                f"new stories/articles: {stats['total_new']}"
            )
            if stats["failed_names"]:
                print("Failed sources:")
                for name in stats["failed_names"]:
                    print(f"  - {name}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
