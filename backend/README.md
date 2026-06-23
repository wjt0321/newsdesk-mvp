# NewsDesk MVP Backend

## 环境

- Python 3.10+
- Windows / Linux / macOS

## 安装

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate  # Windows Git Bash
pip install -e ".[test]"
```

## 启动

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

首次启动会自动创建 `data/newsdesk.db` 并写入 5 个示例 RSS 源。

## 常用 API

- `GET  /api/sources`          列出所有源
- `POST /api/sources`          新增源
- `POST /api/sources/{id}/fetch` 手动触发抓取
- `GET  /api/articles`         查询文章（支持 `source_id`、`hours`、`limit`、`offset`）
- `GET  /api/fetch-logs`       抓取日志

## 测试

```bash
pytest -v
```

## 自动抓取

启动后会自动创建后台调度器，每分钟检查一次已启用的 RSS 源，根据每个源设置的 `fetch_interval_minutes` 自动触发抓取。测试模式下（`TESTING=1`）调度器不会启动。
