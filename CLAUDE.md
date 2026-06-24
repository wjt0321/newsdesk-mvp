# CLAUDE.md — Claude Code 工作约定

本文件专为 Claude Code / Kimi Code CLI 等对话式编码助手准备。请把它与 `AGENTS.md` 一起阅读，并优先遵守用户在本对话中的直接指令。

---

## 1. 项目上下文

- 仓库：`D:/news-aggregator-plan/newsdesk-mvp`
- 已完成阶段：后端核心、Story 聚类、React 看板、频道/关注规则、Tauri Windows 桌面壳。
- 当前状态：已完成一轮代码审核与 bug 修复（级联删除、时区查询、分页、频道关键词、Tauri 生命周期等）；完成前端“Editorial Intelligence Desk”视觉改造与界面中文化；完成订阅源治理 v2（39 个验证可用源，含凤凰网，59.3% 文章带图）。后端 90 项测试通过，前端 lint/build 通过，Tauri cargo check 与分发构建通过。

---

## 2. 你最应该关注的文件

| 场景 | 优先查看 |
|---|---|
| 后端 API/路由问题 | `backend/app/routers/`、`backend/app/schemas.py` |
| 抓取、调度、去重、聚类问题 | `backend/app/services/fetcher.py`、`scheduler.py`、`story_engine.py` |
| 数据库/模型问题 | `backend/app/models.py`、`backend/app/database.py` |
| 时区/时间计算问题 | `backend/app/utils/time.py` |
| 前端页面/组件问题 | `frontend/src/pages/`、`frontend/src/components/` |
| 前端 API 调用问题 | `frontend/src/api/` |
| 桌面壳（托盘、启动后端）问题 | `frontend/src-tauri/src/lib.rs` |
| 测试与烟测 | `backend/tests/`、`scripts/smoke_test.py` |

---

## 3. 调试与修复纪律

- **先复现，再修复**：对任何 bug，优先写最小复现测试，再改代码。
- **一次只改一件事**：不要把 bug 修复与重构、风格调整混在一起提交。
- **时区是高频坑**：凡是涉及 `datetime` 的减法/比较，都必须使用 `ensure_utc()`；写入 SQL 查询的时间窗口请用 `naive_utc_now()`。
- **调度器测试注意 `TESTING` 环境变量**：`scheduler._fetch_all_enabled_sources()` 在 `TESTING=1` 时会直接返回，测试中需用 `monkeypatch.delenv("TESTING")` 临时移除。
- **级联删除依赖 SQLite 外键**：`app.database` 已启用 `PRAGMA foreign_keys=ON`，测试引擎在 `tests/conftest.py` 也启用。修改模型关系时不要破坏这一约定。
- **Tauri 后端进程树**：Windows 下通过 `taskkill /T /F /PID` 清理；不要恢复 `Drop::wait()` 阻塞写法。
- **前端状态更新**：React Query mutation 成功后注意同时失效相关联的查询（如 watch-rules 与 watch-rules/{id}/stories）。

---

## 4. 标准验证流程

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

## 5. 与用户沟通

- 用中文回复，除非用户明确要求英文。
- 代码、命令、文件路径、技术术语保持原文。
- 不要只把代码贴在回复里；必须使用 `Write`/`Edit` 工具真正写入文件系统。
- 完成重要步骤后简要汇报，不要长篇累牍。

---

## 6. 禁止事项

- 不要在没有明确授权时执行 git 历史变更操作。
- 不要修改 `D:/news-aggregator-plan/newsdesk-mvp` 之外的文件。
- 不要把后端数据库文件 `backend/data/newsdesk.db` 提交到 git。
- 不要在生产配置中保留 `allow_origins=["*"]` 作为最终方案（MVP 阶段可接受）。

---

## 7. 扩展建议

如果用户要求新增功能，优先参考 `D:/news-aggregator-plan/` 根目录下的产品文档（`00-index.md` 到 `16-agent-implementation-plan.md`）了解原始规划，再做最小可行实现。
