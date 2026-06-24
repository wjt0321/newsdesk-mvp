# NewsDesk 真实源集合 v2

> 本文件记录 NewsDesk MVP+ 阶段第二批真实来源，用于饱和测试。
> 覆盖领域：国内时政/综合/财经/科技/AI、国际综合/科技/AI、游戏、科学、视频文化。
> 所有源均已通过 `backend/scripts/verify_sources.py` 预检：可访问且能解析出文章。

---

## 使用说明

1. 直接运行后端脚本批量导入并抓取：
   ```bash
   cd backend
   python scripts/import_curated_sources.py --clear
   ```
2. 脚本会先清空现有 sources/articles/stories/fetch_logs，再写入 38 个源并执行一轮抓取。
3. 抓取完成后可在前端 Today 页看到 Hero/Visual 图片卡片。

---

## 源清单

### 国内时政 / 综合

| # | 名称 | URL | 类型 | 语言 | 地区 | 分类 | 抓取间隔 | 图片 |
|---|---|---|---|---|---|---|---|---|
| 1 | 人民日报 | http://www.people.com.cn/rss/politics.xml | RSS | zh-CN | CN | 国内时政 | 60 min | ✅ |
| 2 | 凤凰网 | https://rsshub.ddns.net/ifeng/news | RSSHub | zh-CN | CN | 国内时政 | 30 min | ✅ |
| 3 | 观察者网 | https://rsshub.ddns.net/guancha | RSSHub | zh-CN | CN | 国内时政 | 30 min | ✅ |
| 4 | 观察者热点 | https://rsshub.ddns.net/guancha/redian | RSSHub | zh-CN | CN | 国内时政 | 30 min | ✅ |
| 5 | 网易今日关注 | https://rsshub.ddns.net/163/today | RSSHub | zh-CN | CN | 国内综合 | 30 min | ✅ |
| 6 | 知乎热榜 | https://rsshub.ddns.net/zhihu/hot | RSSHub | zh-CN | CN | 国内综合 | 15 min | ❌ |

### 国内财经

| # | 名称 | URL | 类型 | 语言 | 地区 | 分类 | 抓取间隔 | 图片 |
|---|---|---|---|---|---|---|---|---|
| 7 | 财新最新 | https://rsshub.ddns.net/caixin/latest | RSSHub | zh-CN | CN | 国内财经 | 30 min | ✅ |
| 8 | 第一财经 | https://rsshub.ddns.net/yicai/news | RSSHub | zh-CN | CN | 国内财经 | 30 min | ✅ |
| 9 | 华尔街见闻 - 中国 | https://rsshub.ddns.net/wallstreetcn/news/china | RSSHub | zh-CN | CN | 国内财经 | 30 min | ✅ |
| 10 | 华尔街见闻 - 全球 | https://rsshub.ddns.net/wallstreetcn/news/global | RSSHub | zh-CN | CN | 国际财经 | 30 min | ✅ |

### 国内科技 / AI

| # | 名称 | URL | 类型 | 语言 | 地区 | 分类 | 抓取间隔 | 图片 |
|---|---|---|---|---|---|---|---|---|
| 11 | 36氪快讯 | https://rsshub.ddns.net/36kr/newsflashes | RSSHub | zh-CN | CN | 国内科技 | 30 min | ❌ |
| 12 | 36氪资讯 | https://rsshub.ddns.net/36kr/information/web_news | RSSHub | zh-CN | CN | 国内科技 | 30 min | ✅ |
| 13 | 虎嗅 | https://rsshub.ddns.net/huxiu/article | RSSHub | zh-CN | CN | 国内科技 | 30 min | ✅ |
| 14 | 少数派 | https://rsshub.ddns.net/sspai/index | RSSHub | zh-CN | CN | 国内科技 | 30 min | ✅ |
| 15 | 少数派 Matrix | https://rsshub.ddns.net/sspai/matrix | RSSHub | zh-CN | CN | 国内科技 | 30 min | ✅ |
| 16 | 掘金周榜 | https://rsshub.ddns.net/juejin/trending/all/weekly | RSSHub | zh-CN | CN | 国内科技 | 60 min | ✅ |
| 17 | IT之家 24h | https://rsshub.ddns.net/ithome/ranking/24h | RSSHub | zh-CN | CN | 国内科技 | 30 min | ✅ |
| 18 | 雷峰网 | https://rsshub.ddns.net/leiphone | RSSHub | zh-CN | CN | 国内AI | 30 min | ❌ |
| 19 | Solidot | https://rsshub.ddns.net/solidot/www | RSSHub | zh-CN | CN | 国内科技 | 30 min | ❌ |

### 国际综合

| # | 名称 | URL | 类型 | 语言 | 地区 | 分类 | 抓取间隔 | 图片 |
|---|---|---|---|---|---|---|---|---|
| 20 | BBC 中文 | https://rsshub.ddns.net/bbc/chinese | RSSHub | zh-CN | UK | 国际综合 | 30 min | ✅ |
| 21 | AP Top News | https://rsshub.ddns.net/apnews/topics/ap-top-news | RSSHub | en | US | 国际综合 | 30 min | ❌ |
| 22 | NPR News | https://feeds.npr.org/1001/rss.xml | RSS | en | US | 国际综合 | 30 min | ❌ |

### 国际科技 / AI

| # | 名称 | URL | 类型 | 语言 | 地区 | 分类 | 抓取间隔 | 图片 |
|---|---|---|---|---|---|---|---|---|
| 23 | TechCrunch | https://techcrunch.com/feed/ | RSS | en | US | 国际科技 | 30 min | ❌ |
| 24 | The Verge | https://www.theverge.com/rss/index.xml | RSS | en | US | 国际科技 | 30 min | ❌ |
| 25 | Ars Technica | https://arstechnica.com/feed/ | RSS | en | US | 国际科技 | 30 min | ✅ |
| 26 | Wired | https://www.wired.com/feed/rss | RSS | en | US | 国际科技 | 60 min | ❌ |
| 27 | MIT Technology Review | https://www.technologyreview.com/feed/ | RSS | en | US | 国际科技 | 60 min | ❌ |
| 28 | Engadget | https://www.engadget.com/rss.xml | RSS | en | US | 国际科技 | 30 min | ✅ |
| 29 | CNET | https://www.cnet.com/rss/news/ | RSS | en | US | 国际科技 | 30 min | ✅ |
| 30 | VentureBeat | https://venturebeat.com/feed/ | RSS | en | US | 国际科技 | 30 min | ✅ |
| 31 | Hacker News | https://rsshub.ddns.net/hackernews | RSSHub | en | US | 国际科技 | 15 min | ❌ |
| 32 | Google AI Blog | https://blog.google/technology/ai/rss/ | RSS | en | US | 国际AI | 60 min | ✅ |

### 游戏

| # | 名称 | URL | 类型 | 语言 | 地区 | 分类 | 抓取间隔 | 图片 |
|---|---|---|---|---|---|---|---|---|
| 33 | IGN | https://www.ign.com/rss/articles/feed | RSS | en | US | 游戏 | 30 min | ✅ |
| 34 | GameSpot | https://www.gamespot.com/feeds/news/ | RSS | en | US | 游戏 | 30 min | ✅ |
| 35 | Eurogamer | https://www.eurogamer.net/?format=rss | RSS | en | UK | 游戏 | 30 min | ✅ |
| 36 | PC Gamer | https://www.pcgamer.com/rss/ | RSS | en | US | 游戏 | 30 min | ✅ |

### 科学

| # | 名称 | URL | 类型 | 语言 | 地区 | 分类 | 抓取间隔 | 图片 |
|---|---|---|---|---|---|---|---|---|
| 37 | Nature News | https://www.nature.com/nature.rss | RSS | en | UK | 科学 | 60 min | ❌ |

### 视频 / 文化

| # | 名称 | URL | 类型 | 语言 | 地区 | 分类 | 抓取间隔 | 图片 |
|---|---|---|---|---|---|---|---|---|
| 38 | Bilibili 热门 | https://rsshub.ddns.net/bilibili/popular/all | RSSHub | zh-CN | CN | 视频/文化 | 30 min | ✅ |
| 39 | 豆瓣即将上映 | https://rsshub.ddns.net/douban/movie/later | RSSHub | zh-CN | CN | 视频/文化 | 60 min | ✅ |

---

## 汇总

| 分类 | 数量 | 含图片 |
|---|---|---|
| 国内时政 / 综合 | 6 | 5 |
| 国内财经 | 4 | 4 |
| 国内科技 / AI | 9 | 6 |
| 国际综合 | 3 | 1 |
| 国际科技 / AI | 10 | 5 |
| 游戏 | 4 | 4 |
| 科学 | 1 | 0 |
| 视频 / 文化 | 2 | 2 |
| **合计** | **39** | **27** |

> 标注 "图片" 的源在 RSS 内容中直接携带图片；未标注的源目前以文本卡片展示，后续如需要可启用 OpenGraph 兜底抓取。

---

## 已知不可用的旧源（已剔除）

以下旧 v1 源在验证时返回 404 / 503 / 超时，已从 v2 中移除：

- 新华网时政 (`xinhuanet.com`)
- 中国政府网旧 RSS
- 澎湃新闻旧官方 RSS
- 界面新闻旧官方 RSS
- 虎嗅 / 品玩 / 机器之心 / 量子位 / 新智元 官方 RSS
- 新浪财经 / 东方财富 官方 RSS
- Polygon、Kotaku、Science Magazine 官方 RSS
- BBC / Guardian / NYT / Reuters / Al Jazeera 等海外官方 RSS（当前网络环境下超时）

需要这些源时，可改走 RSSHub 路由或自建 RSSHub 实例。

---

## 2026-06-24 验证与饱和测试记录

- 候选源：66 个
- 预检通过：39 个
- 预检失败：27 个（主要为 RSSHub 503、海外源超时、部分源 403）
- 导入脚本：`backend/scripts/import_curated_sources.py`
- 预检脚本：`backend/scripts/verify_sources.py`

### 实际抓取结果

```text
源成功率：39 / 39（100%）
新增文章：1134 篇
新增 Story：1105 个
带图文章：672 篇（59.3%）
```

Today 首页 Hero / VisualBoard 已能正常渲染封面图片。
