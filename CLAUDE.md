# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 1. 项目上下文

- 仓库：`D:/news-aggregator-plan/newsdesk-mvp`
- 技术栈：Python/FastAPI 后端 + React/TypeScript/Vite 前端 + Tauri 2.x Windows 桌面壳 + SQLite
- 核心能力：RSS/Atom 订阅源抓取 → 文章去重 → Story 聚类 → 看板展示 → 每日简报
- 当前状态：39 个验证可用源（含凤凰网等中文媒体）；后端 90+ 项测试通过；前端 lint/build 通过；Tauri 分发构建通过；界面中文化完成

---

## 2. 架构概览：数据流与关键路径

### 抓取 → 聚类流水线

```
scheduler (每分钟 tick)
  → fetcher.fetch_source() → httpx GET → feedparser 解析
  → normalizer.normalize_entry() → 字段清洗、日期解析
  → 去重: hash_url / canonical_url 查重
  → story_engine.assign_article_to_story() → 三层匹配:
      1) exact URL/hash match (hard dedup)
      2) hash_title match (normalized title + 48h 窗口)
      3) title similarity (rapidfuzz) + entity overlap (中英双语实体归一化)
  → 创建或更新 Story → 重算 heat_score / status
```

### 前端路由

| 路径 | 页面 | 功能 |
|------|------|------|
| `/` | TodayPage | 首页看板 (HeroStory + SecondaryStory + RisingNow) |
| `/stories` | StoriesPage | 全量 Story 列表 (搜索、时间/审查过滤) |
| `/channels` | ChannelsPage | 频道分类浏览 |
| `/watchlist` | WatchlistPage | 关注规则匹配结果 |
| `/sources` | SourcesPage | 订阅源管理 |
| `/sources/:id` | SourceDetailPage | 单源文章/Story 详情 |
| `/source-health` | SourceHealthPage | 源健康状态面板 |
| `/briefing` | BriefingPage | 每日简报 |
| `/search` | SearchPage | 全局搜索 |

### Tauri 桌面壳生命周期

```
lib.rs::run()
  → setup: start_backend() → 优先 sidecar 二进制 → 回退 .venv python
  → 托盘图标 + 右键菜单 (显示/刷新/暂停-恢复/退出)
  → on_window_event::CloseRequested → hide() 而非 destroy()
  → RunEvent::Exit → kill_process_tree() 清理后端进程
```

### 数据库迁移

`backend/app/migrations.py` — 仅支持增量式、幂等迁移（新列、新表、新索引），在 `init_db()` 中自动执行。不支持删除/重命名列；如需此类变更，需手动重建或引入版本化迁移框架。

### AI 摘要 / 简报

`ai_summary.py` → 三层提供者选择：disabled (None) → placeholder → OpenAI-compatible (支持 openai/deepseek/doubao)。每天有调用上限 (`ai_daily_limit`)。摘要基于 source_fingerprint 缓存，内容不变时不重复生成。

---

## 3. 你最应该关注的文件

| 场景 | 优先查看 |
|---|---|
| 后端 API/路由 | `backend/app/routers/`、`backend/app/schemas.py` |
| 抓取与聚类 | `backend/app/services/fetcher.py`、`normalizer.py`、`story_engine.py` |
| 调度器 | `backend/app/services/scheduler.py` |
| 关键词匹配/Watchlist | `backend/app/services/matcher.py` |
| AI 摘要与简报 | `backend/app/services/ai_summary.py`、`briefing.py`、`ai_providers/` |
| 模型与数据库 | `backend/app/models.py`、`database.py`、`migrations.py` |
| 时区工具 | `backend/app/utils/time.py` |
| 配置 (env/设置) | `backend/app/config.py` |
| 初始数据 | `backend/app/seed.py`、`curated_sources.py` |
| 前端页面 | `frontend/src/pages/`、`frontend/src/components/` |
| 前端 API 层 | `frontend/src/api/` |
| Tauri 桌面壳 | `frontend/src-tauri/src/lib.rs` |
| 测试与烟测 | `backend/tests/`、`scripts/smoke_test.py` |
| 前端测试 | `frontend/src/**/*.test.tsx` (vitest) |

---

## 4. 常用命令

### 后端

```bash
# 运行全部测试
cd backend && .venv/Scripts/python -m pytest -q

# 运行单个测试文件
cd backend && .venv/Scripts/python -m pytest tests/test_story_engine.py -q

# 运行单个测试函数
cd backend && .venv/Scripts/python -m pytest tests/test_stories.py::test_list_stories -q

# 启动开发服务器
cd backend && .venv/Scripts/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# 烟测 (完整 API 端到端检查)
cd D:/news-aggregator-plan/newsdesk-mvp
backend/.venv/Scripts/python scripts/smoke_test.py
```

### 前端

```bash
cd frontend
npm run dev          # Vite 开发服务器
npm run build        # 类型检查 + 生产构建
npm run lint         # ESLint
npm run test:run     # vitest 单次运行
npm run tauri:dev    # Tauri 桌面开发模式
npm run tauri:build  # Tauri 桌面分发构建
```

### Rust (仅 Tauri 改动用)

```bash
cd frontend/src-tauri
cargo check          # 类型检查 (比 cargo build 快)
cargo test           # Rust 单元测试 (如有)
```

---

## 5. 调试与修复纪律

- **先复现，再修复**：对任何 bug，优先写最小复现测试，再改代码。
- **一次只改一件事**：不要把 bug 修复与重构、风格调整混在一起提交。
- **时区是高频坑**：凡是涉及 `datetime` 的减法/比较，都必须使用 `ensure_utc()`；写入 SQL 查询的时间窗口请用 `naive_utc_now()`（SQLite 无时区列用 naive UTC）。
- **调度器测试注意 `TESTING` 环境变量**：`scheduler._fetch_all_enabled_sources()` 在 `TESTING=1` 时会直接返回，测试中需用 `monkeypatch.delenv("TESTING")` 临时移除。
- **级联删除依赖 SQLite 外键**：`database.py` 的 `init_db()` 和 `conftest.py` 都启用了 `PRAGMA foreign_keys=ON`。修改模型关系时不要破坏这一约定。
- **Tauri 后端进程树**：Windows 下通过 `taskkill /T /F /PID` 清理；不要恢复 `Drop::wait()` 阻塞写法。
- **前端状态更新**：React Query mutation 成功后注意同时失效相关联的查询（如 watch-rules 与 watch-rules/{id}/stories）。
- **前端测试用 vitest + jsdom**：配置文件在 `vite.config.ts`，test setup 在 `src/test/setup.ts`。

---

## 6. 标准验证流程

每次修改后，按顺序执行：

```bash
# 1. 后端单元测试
cd backend && .venv/Scripts/python -m pytest -q

# 2. 后端烟测
cd D:/news-aggregator-plan/newsdesk-mvp
backend/.venv/Scripts/python scripts/smoke_test.py

# 3. 前端 Lint
cd frontend && npm run lint

# 4. 前端构建
cd frontend && npm run build

# 5. Rust 检查（若改了 Tauri 代码）
cd frontend/src-tauri && cargo check
```

若任何一步失败，先修复再继续。

---

## 7. 配置系统

- 所有后端配置通过 `backend/.env` 文件管理，由 `pydantic_settings.BaseSettings` 加载 (`backend/app/config.py`)。
- 关键配置项：`database_url`（默认 SQLite）、`ai_enabled`（默认 false）、`ai_provider`、`ai_model`、`ai_api_key`、`ai_base_url`、`ai_daily_limit`。
- 支持 AI 提供者：openai、deepseek、doubao、placeholder。前三个使用 OpenAI-compatible 接口，需配置 `ai_base_url` 和 `ai_api_key`。
- 测试环境通过 `TESTING=1` 环境变量隔离，使用内存 SQLite (`sqlite:///:memory:`) 和 StaticPool。

---

## 8. 禁止事项

- 不要在没有明确授权时执行 git 历史变更操作。
- 不要修改 `D:/news-aggregator-plan/newsdesk-mvp` 之外的文件。
- 不要把后端数据库文件 `backend/data/newsdesk.db` 提交到 git。
- 不要在生产配置中保留 `allow_origins=["*"]` 作为最终方案（MVP 阶段可接受）。
- 不要在 `conftest.py` 中硬编码数据库路径 — 始终使用内存数据库。
- 不要创建不可逆的数据库迁移（仅做增量式 `ALTER TABLE ADD COLUMN`）。

---

## 9. 扩展建议

如果用户要求新增功能，优先参考 `D:/news-aggregator-plan/` 根目录下的产品文档（`00-index.md` 到 `16-agent-implementation-plan.md`）了解原始规划，再做最小可行实现。
