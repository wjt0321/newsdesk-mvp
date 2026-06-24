# Agent 工作指南（NewsDesk MVP）

本文件面向所有在此仓库中执行编码任务的 AI Agent / 自动化工具。请优先遵守本文件约定，若有冲突以用户直接指令为准。

---

## 1. 项目定位

- 本项目是 **NewsDesk 新闻聚合看板的最小可用版本（MVP）**，代码位于 `newsdesk-mvp/`。
- 后端为 FastAPI + SQLite，前端为 React + Vite，桌面壳为 Tauri v2 + Rust。
- 目标：稳定、可测试、最小改动。

---

## 2. 目录与关键文件

- 后端入口：`backend/app/main.py`
- 模型：`backend/app/models.py`
- 业务逻辑：`backend/app/services/`
  - `fetcher.py` — 抓取来源
  - `story_engine.py` — 去重与聚类
  - `scheduler.py` — 定时任务
  - `story_serializer.py` — Story 序列化
  - `normalizer.py` — 文章字段与图片归一化
- 路由：`backend/app/routers/`
- 测试：`backend/tests/`
- 源治理脚本：`backend/scripts/`
  - `verify_sources.py` — 批量验证 RSS/RSSHub 候选源
  - `import_curated_sources.py` — 导入 `real-sources-v2.md` 中的 39 个验证源
- 前端入口：`frontend/src/main.tsx`、`frontend/src/App.tsx`
- 前端 API：`frontend/src/api/`
- Tauri Rust：`frontend/src-tauri/src/lib.rs`

---

## 3. 编码风格

- Python：PEP 8，类型注解可选但推荐，使用 `from __future__ import annotations` 无妨。
- TypeScript：严格模式已开启，优先使用显式类型，避免 `any`。
- Rust：遵循 `cargo fmt` 与 `cargo clippy` 默认规则。
- 命名：函数/变量用 `snake_case`，React 组件用 `PascalCase`，API 路径用 `kebab-case`。

---

## 4. 时间与时区

- **统一使用 UTC**：新增时间戳请用 `app.utils.time.utc_now()`。
- **从数据库读取的 datetime 视为 naive**，必须通过 `app.utils.time.ensure_utc(dt)` 转成 aware 后再做加减或比较。
- 不要在代码中直接对 `Source.last_fetched_at`、`Story.last_updated_at` 等字段做 aware - naive 减法。

---

## 5. 测试要求

- 任何 bug 修复必须附带回归测试（最小复现）。
- 新增 API/服务需补充对应测试。
- 后端测试命令：

```bash
cd backend
.venv/Scripts/python -m pytest -q
```

- 前端 Lint 命令（新增）：

```bash
cd frontend
npm run lint
```

- 后端烟测命令：

```bash
cd newsdesk-mvp
backend/.venv/Scripts/python scripts/smoke_test.py
```

---

## 6. 提交前检查清单

- [ ] `backend/.venv/Scripts/python -m pytest -q` 全部通过。
- [ ] `backend/.venv/Scripts/python scripts/smoke_test.py` 通过。
- [ ] `cd frontend && npm run lint` 成功。
- [ ] `cd frontend && npm run build` 成功。
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

- **SQLite 外键**：`backend/app/database.py` 在连接时执行 `PRAGMA foreign_keys=ON`，以支持模型中配置的 `ondelete="CASCADE"`。迁移到 PostgreSQL 后应移除该 pragma，改用 `DateTime(timezone=True)`。
- **Tauri 生产包限制**：桌面壳当前通过 `start_backend.bat` 启动本地 Python 后端。打包安装后需要把 `backend/` 目录（含 `.venv`）与可执行文件一起分发，或后续改为嵌入式后端可执行文件。
- **后端 sidecar 生命周期**：Windows 下使用 `taskkill /T /F /PID` 结束后端进程树；修改 Rust 代码时不要恢复 `Drop::wait()` 这类可能阻塞主线程的写法。

---

## 9. 安全与权限

- 不执行 `git commit`、`git push`、`git reset`、`git rebase` 等变更历史操作，除非用户明确授权。
- 不修改工作目录外的文件。
- 不下载或执行来源不明的二进制/脚本。
