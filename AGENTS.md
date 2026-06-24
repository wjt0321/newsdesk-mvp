# Agent 工作指南（NewsDesk MVP）

本文件面向所有在此仓库中执行编码任务的 AI Agent / 自动化工具。请与 `CLAUDE.md` 一起阅读，若有冲突以用户直接指令为准。

---

## 1. 项目定位

- 本项目是 **NewsDesk 新闻聚合看板的最小可用版本（MVP）**，代码位于 `newsdesk-mvp/`。
- 后端为 FastAPI + SQLite，前端为 React + Vite，桌面壳为 Tauri v2 + Rust。
- 目标：稳定、可测试、最小改动。

---

## 2. 目录与关键文件

### 后端

| 层级 | 文件/目录 | 说明 |
|------|-----------|------|
| 入口 | `backend/app/main.py` | FastAPI 应用、lifespan、CORS、路由注册 |
| 模型 | `backend/app/models.py` | 7 个 SQLAlchemy 模型 (Source / Article / Story / StoryArticleLink / FetchLog / WatchRule / StoryAISummary / SystemState) |
| 数据库 | `backend/app/database.py` | SQLite 引擎、外键 pragma、Session 工厂 |
| 迁移 | `backend/app/migrations.py` | 增量式、幂等迁移（仅 ALTER TABLE ADD COLUMN） |
| 配置 | `backend/app/config.py` | pydantic_settings 从 .env 加载 |
| API 层 | `backend/app/routers/` | 8 个路由模块 (sources / source_health / articles / stories / watch_rules / channels / system / briefing / fetch_logs) |
| Schema | `backend/app/schemas.py` | Pydantic 请求/响应模型 |
| 业务逻辑 | `backend/app/services/` | 见下方服务清单 |
| 初始数据 | `backend/app/seed.py`、`curated_sources.py` | 39 个验证源种子数据 |
| 测试 | `backend/tests/` | pytest + TestClient，22 个测试文件 |
| 时间工具 | `backend/app/utils/time.py` | `utc_now()` / `naive_utc_now()` / `ensure_utc()` |

### 后端服务清单

| 服务 | 职责 |
|------|------|
| `fetcher.py` | httpx + feedparser 抓取 RSS/Atom，双模式（同步/后台线程） |
| `normalizer.py` | 文章字段归一化、图片提取、日期解析 |
| `story_engine.py` | 三层聚类匹配（URL / title_hash / similarity+entity）、热度计算、Story 合并/拆分 |
| `story_serializer.py` | Story → StoryRead 序列化（含 clean_title/clean_summary） |
| `story_diff.py` | 同 Story 内多来源文章差异对比 |
| `matcher.py` | WatchRule 关键词 → Story 匹配（SQL 层 LIKE + Python 二次校验） |
| `content_cleaner.py` | 标题/摘要清洗（HTML 标签、控制字符、空白） |
| `scheduler.py` | APScheduler 后台定时抓取（1 分钟间隔） |
| `maintenance.py` | 后台清理任务 |
| `ai_summary.py` | AI 摘要生成与缓存（fingerprint 去重） |
| `briefing.py` | 每日简报生成（Top 10 Story + 可选 AI 润色） |
| `ai_providers/` | AI 提供者抽象层（base / openai_compatible / placeholder） |

### 前端

| 层级 | 文件/目录 | 说明 |
|------|-----------|------|
| 入口 | `frontend/src/main.tsx`、`App.tsx` | React Router 路由定义（9 个页面） |
| 页面 | `frontend/src/pages/` | TodayPage / StoriesPage / ChannelsPage / WatchlistPage / SourcesPage / SourceDetailPage / SourceHealthPage / BriefingPage / SearchPage |
| 组件 | `frontend/src/components/` | AppShell / TopBar / StoryCard / VisualBoard / FocusStrip / TextFeed / RisingNow 等 |
| API 层 | `frontend/src/api/` | axios 客户端，按资源分文件（sources / articles / stories / channels / watchRules / system / fetchLogs） |
| Hooks | `frontend/src/hooks/` | useDashboardContext / useTodayStories / useRefreshDashboard / useSourceDetail |
| 测试 | `frontend/src/**/*.test.tsx` | vitest + jsdom + React Testing Library |

### Tauri 桌面壳

| 文件 | 说明 |
|------|------|
| `frontend/src-tauri/src/lib.rs` | 后端进程生命周期管理、系统托盘、菜单事件 |
| `frontend/src-tauri/Cargo.toml` | Rust 依赖（tauri 2.x / reqwest / tauri-plugin-*） |
| `frontend/src-tauri/tauri.conf.json` | Tauri 应用配置 |

---

## 3. 编码风格

- Python：PEP 8，类型注解可选但推荐。使用 `from __future__ import annotations` 无妨。
- TypeScript：严格模式已开启，优先使用显式类型，避免 `any`。
- Rust：遵循 `cargo fmt` 与 `cargo clippy` 默认规则。
- 命名：函数/变量用 `snake_case`，React 组件用 `PascalCase`，API 路径用 `kebab-case`。

---

## 4. 时间与时区

- **统一使用 UTC**：新增时间戳请用 `app.utils.time.utc_now()`。
- **数据库写入用 naive UTC**：SQLite 无时区列类型，使用 `naive_utc_now()` 写入。
- **从数据库读取的 datetime 视为 naive**，必须通过 `ensure_utc(dt)` 转成 aware 后再做加减或比较。
- 不要在代码中直接对 `Source.last_fetched_at`、`Story.last_updated_at` 等字段做 aware - naive 减法。

---

## 5. 测试要求

- 任何 bug 修复必须附带回归测试（最小复现）。
- 新增 API/服务需补充对应测试。
- 后端测试使用内存 SQLite (`sqlite:///:memory:`)，conftest.py 自动设置 `TESTING=1`。

```bash
# 后端全部测试
cd backend && .venv/Scripts/python -m pytest -q

# 后端单个测试文件
cd backend && .venv/Scripts/python -m pytest tests/test_story_engine.py -q

# 后端单个测试函数
cd backend && .venv/Scripts/python -m pytest tests/test_stories.py::test_list_stories -q

# 后端烟测
cd D:/news-aggregator-plan/newsdesk-mvp
backend/.venv/Scripts/python scripts/smoke_test.py

# 前端测试
cd frontend && npm run test:run

# 前端 Lint
cd frontend && npm run lint
```

---

## 6. 提交前检查清单

- [ ] `cd backend && .venv/Scripts/python -m pytest -q` 全部通过。
- [ ] `backend/.venv/Scripts/python scripts/smoke_test.py` 通过。
- [ ] `cd frontend && npm run lint` 成功。
- [ ] `cd frontend && npm run build` 成功。
- [ ] `cd frontend && npm run test:run` 通过。
- [ ] `cd frontend/src-tauri && cargo check` 成功（如修改了 Rust 代码）。
- [ ] 不引入新依赖，除非必要且已更新 `pyproject.toml` / `package.json`。
- [ ] 不提交敏感信息、`.env`、构建产物或数据库文件。

---

## 7. 依赖管理

- Python：使用 `pyproject.toml`，通过 `pip install -e ".[test]"` 安装。
- Node：使用 npm，禁止在生产目录使用 `yarn` 或 `pnpm` 除非用户要求。
- Rust：使用 cargo，优先使用稳定版 crates。

---

## 8. 重要实现约束

- **SQLite 外键**：`database.py` 的 `init_db()` 和 `conftest.py` 都启用 `PRAGMA foreign_keys=ON`，以支持模型中配置的 `ondelete="CASCADE"`。修改模型关系时确保级联删除约定不被破坏。
- **数据库迁移仅做增量**：`migrations.py` 只支持 `ALTER TABLE ADD COLUMN` 和新索引。不要尝试删除/重命名列；如需此类变更，引入版本化迁移框架或手动重建。
- **Tauri 后端进程树**：Windows 下使用 `taskkill /T /F /PID` 结束后端进程树；不要恢复 `Drop::wait()` 阻塞写法。
- **Tauri 生产包限制**：桌面壳优先使用 sidecar 二进制（PyInstaller 打包），回退到开发模式的 `.venv/python` 启动。`CREATENO_WINDOW` 标志防止弹控制台窗口。
- **调度器测试注意 `TESTING` 环境变量**：`scheduler._fetch_all_enabled_sources()` 在 `TESTING=1` 时直接返回，测试中需用 `monkeypatch.delenv("TESTING")` 临时移除。
- **前端状态更新**：React Query mutation 成功后注意同时失效相关联的查询缓存。

---

## 9. 安全与权限

- 不执行 `git commit`、`git push`、`git reset`、`git rebase` 等变更历史操作，除非用户明确授权。
- 不修改工作目录外的文件。
- 不下载或执行来源不明的二进制/脚本。
- 不提交数据库文件（`*.db`）、`.env`、构建产物到 git。
