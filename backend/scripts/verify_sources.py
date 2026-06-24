"""Quickly verify a list of RSS/RSSHub candidate feeds.

Usage:
    python scripts/verify_sources.py

Outputs scripts/verify_results.json with reachability and image metadata.
"""

from __future__ import annotations

import concurrent.futures
import html
import json
import re
from dataclasses import asdict, dataclass
from typing import Any

import feedparser
import httpx

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 NewsDesk/0.1.0"
    ),
    "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
}

_IMG_SRC_RE = re.compile(r'<img[^>]+src="([^"]+)"')
_IMG_SRC_SINGLE_RE = re.compile(r"<img[^>]+src='([^']+)'")


@dataclass
class Candidate:
    name: str
    url: str
    category: str
    source_type: str = "rss"
    language: str = "zh-CN"
    region: str = "CN"
    fetch_interval_minutes: int = 30
    trust_level: int = 4


CANDIDATES: list[Candidate] = [
    # 国内时政 / 综合
    Candidate("人民日报", "http://www.people.com.cn/rss/politics.xml", "国内时政", "rss", "zh-CN", "CN", 60),
    Candidate("新华社新闻", "https://rsshub.ddns.net/xinhua/news", "国内时政", "rsshub", "zh-CN", "CN", 30),
    Candidate("中国政府网最新政策", "https://rsshub.ddns.net/gov/zhengce/zuixin", "政策监管", "rsshub", "zh-CN", "CN", 60),
    Candidate("凤凰网", "https://rsshub.ddns.net/ifeng/news", "国内时政", "rsshub", "zh-CN", "CN", 30),
    Candidate("观察者网", "https://rsshub.ddns.net/guancha", "国内时政", "rsshub", "zh-CN", "CN", 30),
    Candidate("联合早报 - 中国", "https://rsshub.ddns.net/zaobao/realtime/china", "国内时政", "rsshub", "zh-CN", "SG", 30),
    Candidate("联合早报 - 国际", "https://rsshub.ddns.net/zaobao/realtime/world", "国际综合", "rsshub", "zh-CN", "SG", 30),
    Candidate("澎湃新闻", "https://rsshub.ddns.net/thepaper/channel/25490", "国内综合", "rsshub", "zh-CN", "CN", 30),
    Candidate("界面新闻", "https://rsshub.ddns.net/jiemian", "国内综合", "rsshub", "zh-CN", "CN", 30),
    Candidate("网易今日关注", "https://rsshub.ddns.net/163/today", "国内综合", "rsshub", "zh-CN", "CN", 30),
    # 国内财经
    Candidate("财新最新", "https://rsshub.ddns.net/caixin/latest", "国内财经", "rsshub", "zh-CN", "CN", 30),
    Candidate("第一财经", "https://rsshub.ddns.net/yicai/news", "国内财经", "rsshub", "zh-CN", "CN", 30),
    Candidate("华尔街见闻 - 中国", "https://rsshub.ddns.net/wallstreetcn/news/china", "国内财经", "rsshub", "zh-CN", "CN", 30),
    Candidate("华尔街见闻 - 全球", "https://rsshub.ddns.net/wallstreetcn/news/global", "国际财经", "rsshub", "zh-CN", "CN", 30),
    Candidate("新浪财经", "https://rsshub.ddns.net/sina/finance", "国内财经", "rsshub", "zh-CN", "CN", 30),
    Candidate("东方财富研报", "https://rsshub.ddns.net/eastmoney/report/news", "国内财经", "rsshub", "zh-CN", "CN", 60),
    # 国内科技 / AI
    Candidate("36氪快讯", "https://rsshub.ddns.net/36kr/newsflashes", "国内科技", "rsshub", "zh-CN", "CN", 30),
    Candidate("虎嗅", "https://rsshub.ddns.net/huxiu/article", "国内科技", "rsshub", "zh-CN", "CN", 30),
    Candidate("钛媒体", "https://rsshub.ddns.net/tmtpost", "国内科技", "rsshub", "zh-CN", "CN", 30),
    Candidate("品玩", "https://rsshub.ddns.net/pingwest/latest", "国内科技", "rsshub", "zh-CN", "CN", 30),
    Candidate("少数派", "https://rsshub.ddns.net/sspai/index", "国内科技", "rsshub", "zh-CN", "CN", 30),
    Candidate("掘金周榜", "https://rsshub.ddns.net/juejin/trending/all/weekly", "国内科技", "rsshub", "zh-CN", "CN", 60),
    Candidate("机器之心", "https://rsshub.ddns.net/jiqizhixin", "国内AI", "rsshub", "zh-CN", "CN", 30),
    Candidate("量子位", "https://rsshub.ddns.net/qbitai", "国内AI", "rsshub", "zh-CN", "CN", 30),
    Candidate("雷峰网", "https://rsshub.ddns.net/leiphone", "国内AI", "rsshub", "zh-CN", "CN", 30),
    Candidate("新智元", "https://rsshub.ddns.net/aitimes", "国内AI", "rsshub", "zh-CN", "CN", 30),
    Candidate("知乎热榜", "https://rsshub.ddns.net/zhihu/hot", "国内综合", "rsshub", "zh-CN", "CN", 15),
    Candidate("微博热搜", "https://rsshub.ddns.net/weibo/search/hot", "国内综合", "rsshub", "zh-CN", "CN", 15),
    Candidate("百度热搜", "https://rsshub.ddns.net/baidu/hot", "国内综合", "rsshub", "zh-CN", "CN", 15),
    Candidate("Bilibili 热门", "https://rsshub.ddns.net/bilibili/popular/all", "视频/文化", "rsshub", "zh-CN", "CN", 30),
    # 国际综合
    Candidate("BBC Top Stories", "https://feeds.bbci.co.uk/news/rss.xml", "国际综合", "rss", "en", "UK", 30),
    Candidate("BBC 中文", "https://rsshub.ddns.net/bbc/chinese", "国际综合", "rsshub", "zh-CN", "UK", 30),
    Candidate("The Guardian", "https://www.theguardian.com/uk/rss", "国际综合", "rss", "en", "UK", 30),
    Candidate("NYT World", "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", "国际综合", "rss", "en", "US", 30),
    Candidate("Reuters", "https://rsshub.ddns.net/reuters/business/finance", "国际财经", "rsshub", "en", "US", 30),
    Candidate("AP Top News", "https://rsshub.ddns.net/apnews/topics/ap-top-news", "国际综合", "rsshub", "en", "US", 30),
    Candidate("Al Jazeera", "https://www.aljazeera.com/xml/rss/all.xml", "国际综合", "rss", "en", "QA", 30),
    Candidate("Washington Post World", "https://feeds.washingtonpost.com/rss/world", "国际综合", "rss", "en", "US", 30),
    Candidate("CNN Top", "http://rss.cnn.com/rss/edition.rss", "国际综合", "rss", "en", "US", 30),
    Candidate("NPR News", "https://feeds.npr.org/1001/rss.xml", "国际综合", "rss", "en", "US", 30),
    Candidate("The Atlantic", "https://www.theatlantic.com/feed/all/", "国际综合", "rss", "en", "US", 60),
    Candidate("The Economist", "https://www.economist.com/latest/rss.xml", "国际综合", "rss", "en", "UK", 60),
    Candidate("Bloomberg", "https://rsshub.ddns.net/bloomberg/latest", "国际财经", "rsshub", "en", "US", 30),
    Candidate("WSJ World", "https://rsshub.ddns.net/wsj/en-us/world", "国际财经", "rsshub", "en", "US", 30),
    # 国际科技
    Candidate("TechCrunch", "https://techcrunch.com/feed/", "国际科技", "rss", "en", "US", 30),
    Candidate("The Verge", "https://www.theverge.com/rss/index.xml", "国际科技", "rss", "en", "US", 30),
    Candidate("Ars Technica", "https://arstechnica.com/feed/", "国际科技", "rss", "en", "US", 30),
    Candidate("Wired", "https://www.wired.com/feed/rss", "国际科技", "rss", "en", "US", 60),
    Candidate("MIT Technology Review", "https://www.technologyreview.com/feed/", "国际科技", "rss", "en", "US", 60),
    Candidate("Engadget", "https://www.engadget.com/rss.xml", "国际科技", "rss", "en", "US", 30),
    Candidate("CNET", "https://www.cnet.com/rss/news/", "国际科技", "rss", "en", "US", 30),
    Candidate("VentureBeat", "https://venturebeat.com/feed/", "国际科技", "rss", "en", "US", 30),
    Candidate("Hacker News", "https://rsshub.ddns.net/hackernews", "国际科技", "rsshub", "en", "US", 15),
    Candidate("GitHub Trending", "https://rsshub.ddns.net/github/trending/daily", "国际科技", "rsshub", "en", "US", 60),
    Candidate("Product Hunt", "https://rsshub.ddns.net/producthunt/today", "国际科技", "rsshub", "en", "US", 30),
    # 游戏
    Candidate("IGN", "https://www.ign.com/rss/articles/feed", "游戏", "rss", "en", "US", 30),
    Candidate("GameSpot", "https://www.gamespot.com/feeds/news/", "游戏", "rss", "en", "US", 30),
    Candidate("Kotaku", "https://kotaku.com/rss", "游戏", "rss", "en", "US", 30),
    Candidate("Polygon", "https://www.polygon.com/rss/index.xml", "游戏", "rss", "en", "US", 30),
    Candidate("Eurogamer", "https://www.eurogamer.net/?format=rss", "游戏", "rss", "en", "UK", 30),
    Candidate("PC Gamer", "https://www.pcgamer.com/rss/", "游戏", "rss", "en", "US", 30),
    # 科学
    Candidate("Nature News", "https://www.nature.com/nature.rss", "科学", "rss", "en", "UK", 60),
    Candidate("Science Magazine", "https://www.science.org/rss/news_current.xml", "科学", "rss", "en", "US", 60),
]


def extract_image(entry: Any) -> str | None:
    if hasattr(entry, "media_thumbnail") and entry.media_thumbnail:
        url = entry.media_thumbnail[0].get("url")
        if url:
            return url
    if hasattr(entry, "media_content") and entry.media_content:
        url = entry.media_content[0].get("url")
        if url:
            return url
    for link in getattr(entry, "links", []):
        if link.get("type", "").startswith("image"):
            return link.get("href")
    for enclosure in getattr(entry, "enclosures", []):
        if enclosure.get("type", "").startswith("image"):
            return enclosure.get("href")

    html_text = getattr(entry, "summary", "") or ""
    if hasattr(entry, "content") and entry.content:
        first = entry.content[0]
        if isinstance(first, dict):
            html_text = html_text or first.get("value", "")
        elif isinstance(first, str):
            html_text = html_text or first
    if html_text:
        match = _IMG_SRC_RE.search(html_text) or _IMG_SRC_SINGLE_RE.search(html_text)
        if match:
            return html.unescape(match.group(1).strip())
    return None


def verify(candidate: Candidate) -> dict[str, Any]:
    result = asdict(candidate)
    try:
        with httpx.Client(headers=_HEADERS, timeout=15, follow_redirects=True) as client:
            resp = client.get(candidate.url)
            resp.raise_for_status()
            data = feedparser.parse(resp.text)
            n = len(data.entries)
            first_img = extract_image(data.entries[0]) if n else None
            result.update(
                {
                    "ok": True,
                    "entries": n,
                    "has_image": bool(first_img),
                    "sample_image": first_img,
                    "bozo": bool(data.bozo),
                    "feed_title": data.feed.get("title", ""),
                }
            )
    except Exception as exc:
        result.update({"ok": False, "error": str(exc)})
    return result


def main() -> None:
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        results = list(executor.map(verify, CANDIDATES))

    ok_results = [r for r in results if r["ok"]]
    fail_results = [r for r in results if not r["ok"]]

    print(f"Verified {len(results)} candidates: {len(ok_results)} OK, {len(fail_results)} failed")
    print("\nWorking feeds with images:")
    for r in ok_results:
        if r["has_image"]:
            print(f"  [IMG] {r['name']} ({r['entries']} entries) - {r['url']}")
    print("\nWorking feeds without images:")
    for r in ok_results:
        if not r["has_image"]:
            print(f"  [TXT] {r['name']} ({r['entries']} entries) - {r['url']}")
    print("\nFailed feeds:")
    for r in fail_results:
        print(f"  [FAIL] {r['name']} - {r['url']} - {r['error']}")

    out_path = __file__.replace("verify_sources.py", "verify_results.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\nResults written to {out_path}")


if __name__ == "__main__":
    main()
