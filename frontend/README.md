# NewsDesk MVP 前端

NewsDesk 的 React + TypeScript + Vite 前端，用于展示新闻聚合后的 Story、来源管理、频道筛选与关注规则。

---

## 技术栈

- **React 19** + **TypeScript**（strict mode）
- **Vite 6** 构建与开发服务器
- **Tailwind CSS 4** 样式
- **TanStack Query** 服务端状态管理
- **React Router** 路由
- **Lucide React** 图标

---

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:5173）
npm run dev

# ESLint 检查
npm run lint

# TypeScript 类型检查
npx tsc -b

# 生产构建
npm run build
```

> 开发前请先启动后端：`D:/news-aggregator-plan/newsdesk-mvp/backend/.venv/Scripts/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000`

---

## 目录结构

```
src/
├── api/              # API 客户端与类型定义
│   ├── index.ts      # axios 实例与通用请求
│   ├── types.ts      # TypeScript 类型
│   ├── sources.ts
│   ├── stories.ts
│   ├── articles.ts
│   ├── channels.ts
│   └── watchRules.ts
├── components/       # 通用组件
│   ├── AppShell.tsx  # 侧边栏 + 顶部栏布局
│   ├── StoryCard.tsx # Story 卡片（含 breaking / hot / new / developing / stable 状态）
│   ├── StoryDrawer.tsx
│   └── ...
├── pages/            # 路由页面
│   ├── TodayPage.tsx
│   ├── StoriesPage.tsx
│   ├── SourcesPage.tsx
│   ├── ChannelsPage.tsx
│   └── WatchlistPage.tsx
├── lib/              # 工具函数
│   └── format.ts     # 相对时间格式化
├── App.tsx           # 路由与全局布局
└── main.tsx          # 应用入口
```

---

## 路由

| 路径 | 页面 | 说明 |
|---|---|---|
| `/` | TodayPage | 今日焦点看板 |
| `/stories` | StoriesPage | 全部 Story 列表 |
| `/sources` | SourcesPage | 来源管理与添加 |
| `/channels/:slug` | ChannelsPage | 频道筛选 |
| `/watchlist` | WatchlistPage | 关注规则管理 |

---

## 环境变量

前端目前没有独立的环境变量。后端地址在 `src/api/index.ts` 中硬编码为 `http://127.0.0.1:8000`。

如需自定义，可在项目根目录创建 `.env` 并定义 `VITE_API_BASE_URL`，然后修改 `src/api/index.ts` 读取 `import.meta.env.VITE_API_BASE_URL`。

---

## Tauri 桌面端

```bash
# 开发模式（启动 Tauri 窗口）
npm run tauri:dev

# 构建 Windows 安装包
npm run tauri:build
```

Tauri 源码位于 `src-tauri/`。
