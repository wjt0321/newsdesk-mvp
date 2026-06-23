# NewsDesk 真实源集合 v1

> 本文件记录 NewsDesk MVP+ 阶段第一批真实来源，用于 24h / 7d 长跑验证。
> 覆盖领域：国内、国际、财经、科技、AI、游戏、政策监管。
> 每个源需记录 `quality_note`：稳定性、噪音、图片质量、更新频率。

---

## 使用说明

1. 通过 SourcesPage 或种子脚本批量导入下方来源。
2. 导入后先跑一轮手动抓取，剔除 404 / 非 RSS / 无更新的源。
3. 运行 `scripts/run_long_report.py --duration 24h` 生成观测报告。
4. 根据报告把 `status` 更新为 `active` / `degraded` / `broken` / `noisy` / `silent`。

---

## 国内综合 / 时政

| # | 名称 | URL | 类型 | 语言 | 地区 | 分类 | 抓取间隔 | 状态 | quality_note |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 人民日报 | http://www.people.com.cn/rss/politics.xml | RSS | zh-CN | CN | 时政 | 60 min | active | 待验证稳定性 |
| 2 | 新华网时政 | http://www.xinhuanet.com/politics/news.xml | RSS | zh-CN | CN | 时政 | 60 min | active | 待验证稳定性 |
| 3 | 中国政府网 | http://www.gov.cn/pushinfo_v1505/pushinfo.xml | RSS | zh-CN | CN | 政策监管 | 60 min | active | 待验证更新频率 |
| 4 | 澎湃新闻 | https://www.thepaper.cn/rss.xml | RSS | zh-CN | CN | 综合 | 30 min | active | 待验证 |
| 5 | 界面新闻 | https://www.jiemian.com/rss.xml | RSS | zh-CN | CN | 综合 | 30 min | active | 待验证 |

## 国内科技 / 创业

| # | 名称 | URL | 类型 | 语言 | 地区 | 分类 | 抓取间隔 | 状态 | quality_note |
|---|---|---|---|---|---|---|---|---|---|
| 6 | 36氪 | https://36kr.com/feed | RSS | zh-CN | CN | 科技/创业 | 30 min | active | 更新频繁，需观察噪音 |
| 7 | 虎嗅 | https://www.huxiu.com/rss | RSS | zh-CN | CN | 科技/商业 | 30 min | active | 待验证 |
| 8 | 钛媒体 | https://www.tmtpost.com/rss.xml | RSS | zh-CN | CN | 科技/商业 | 30 min | active | 待验证 |
| 9 | 品玩 | https://www.pingwest.com/rss | RSS | zh-CN | CN | 科技 | 30 min | active | 待验证 |
| 10 | 极客公园 | https://www.geekpark.net/rss | RSS | zh-CN | CN | 科技 | 30 min | broken | 首轮抓取失败，解析或网络问题 |

## 国内 AI

| # | 名称 | URL | 类型 | 语言 | 地区 | 分类 | 抓取间隔 | 状态 | quality_note |
|---|---|---|---|---|---|---|---|---|---|
| 11 | 机器之心 | https://www.jiqizhixin.com/rss | RSS | zh-CN | CN | AI | 30 min | active | AI 领域核心源 |
| 12 | 量子位 | https://www.qbitai.com/rss.xml | RSS | zh-CN | CN | AI | 30 min | active | 待验证 |
| 13 | AI 科技评论 | https://www.leiphone.com/rss | RSS | zh-CN | CN | AI | 30 min | active | 待验证 |
| 14 | 新智元 | https://www.aitimes.cn/rss | RSS | zh-CN | CN | AI | 30 min | active | 待验证 |

## 国内财经

| # | 名称 | URL | 类型 | 语言 | 地区 | 分类 | 抓取间隔 | 状态 | quality_note |
|---|---|---|---|---|---|---|---|---|---|
| 15 | 财新 | https://weekly.caixin.com/rss.xml | RSS | zh-CN | CN | 财经 | 60 min | active | 可能有付费墙摘要 |
| 16 | 华尔街见闻 | https://wallstreetcn.com/rss | RSS | zh-CN | CN | 财经 | 30 min | active | 更新频繁 |
| 17 | 新浪财经 | https://finance.sina.com.cn/rss.xml | RSS | zh-CN | CN | 财经 | 30 min | active | 待验证 |
| 18 | 东方财富网 | https://fund.eastmoney.com/rss/feed.xml | RSS | zh-CN | CN | 财经 | 60 min | active | 待验证 |

## 国际综合 / 时政

| # | 名称 | URL | 类型 | 语言 | 地区 | 分类 | 抓取间隔 | 状态 | quality_note |
|---|---|---|---|---|---|---|---|---|---|
| 19 | Reuters | https://www.reutersagency.com/feed/?best-topics=tech | RSS | en | US | 综合 | 30 min | active | 国际核心源 |
| 20 | BBC News | http://feeds.bbci.co.uk/news/rss.xml | RSS | en | UK | 综合 | 30 min | active | 待验证 |
| 21 | The Guardian | https://www.theguardian.com/uk/rss | RSS | en | UK | 综合 | 30 min | active | 待验证 |

## 国际科技

| # | 名称 | URL | 类型 | 语言 | 地区 | 分类 | 抓取间隔 | 状态 | quality_note |
|---|---|---|---|---|---|---|---|---|---|
| 22 | TechCrunch | https://techcrunch.com/feed/ | RSS | en | US | 科技 | 30 min | active | 更新频繁 |
| 23 | The Verge | https://www.theverge.com/rss/index.xml | RSS | en | US | 科技 | 30 min | active | 待验证 |
| 24 | Ars Technica | https://arstechnica.com/feed/ | RSS | en | US | 科技 | 30 min | active | 待验证 |
| 25 | Wired | https://www.wired.com/feed/rss | RSS | en | US | 科技 | 60 min | active | 待验证 |
| 26 | MIT Technology Review | https://www.technologyreview.com/feed/ | RSS | en | US | 科技 | 60 min | active | 待验证 |

## 国际 AI

| # | 名称 | URL | 类型 | 语言 | 地区 | 分类 | 抓取间隔 | 状态 | quality_note |
|---|---|---|---|---|---|---|---|---|---|
| 27 | AI News | https://www.artificialintelligence-news.com/feed/ | RSS | en | US | AI | 30 min | active | 待验证 |
| 28 | VentureBeat | https://venturebeat.com/feed/ | RSS | en | US | AI/科技 | 30 min | active | 待验证 |

## 国际游戏

| # | 名称 | URL | 类型 | 语言 | 地区 | 分类 | 抓取间隔 | 状态 | quality_note |
|---|---|---|---|---|---|---|---|---|---|
| 29 | Polygon | https://www.polygon.com/rss/index.xml | RSS | en | US | 游戏 | 60 min | disabled | 连续失败，网络不可达，已禁用并替换为 GameSpot |
| 30 | IGN | https://www.ign.com/rss/articles/feed | RSS | en | US | 游戏 | 60 min | active | 24h 长跑验证正常 |
| 31 | GameSpot | https://www.gamespot.com/feeds/news/ | RSS | en | US | 游戏 | 60 min | active | 替代 Polygon，RSS 可达 |

---

## 汇总

| 分类 | 数量 |
|---|---|
| 国内综合/时政 | 5 |
| 国内科技/创业 | 5 |
| 国内 AI | 4 |
| 国内财经 | 4 |
| 国际综合/时政 | 3 |
| 国际科技 | 5 |
| 国际 AI | 2 |
| 国际游戏 | 3 |
| **真实源合计** | **31** |
| **含默认种子源合计** | **35** |

---

## 验证记录模板

每次长跑后更新下方记录：

### 2026-06-23 24h 长跑报告

- 总启用源：34（30 个真实源 + 4 个默认种子源，1 个真实源 BBC 与种子重复）
- 成功源：32
- 失败源：2（Polygon、极客公园）
- 噪音源：0
- 新增文章：314
- 新增 Story：151
- 源成功率：94.1%
- 报告：`reports/20260623-032622-long-report.md`
- 抓取明细：`reports/20260623-032610-fetch-all-report.md`

> 除 Polygon、极客公园外，其余来源状态已根据本次长跑结果更新为 `active`。
> 后续处理：Polygon 已禁用并替换为 GameSpot；极客公园待观察。

### 2026-06-23 源治理更新

- Polygon：确认网络不可达，状态改为 `disabled`，新增 GameSpot 作为替代。
- 极客公园：首轮失败，后续若连续健康可恢复为 `active`。
- GameSpot：`https://www.gamespot.com/feeds/news/` 验证可达，作为国际游戏类补充源。
- 真实源总数从 30 调整为 31（含新增 GameSpot，Polygon 保留记录但 disabled）。

```markdown
### 2026-XX-XX 24h 报告

- 总启用源：30
- 成功源：X
- 失败源：X（列出）
- 噪音源：X（列出）
- 新增 story：X
- 重复率：X%
```
