import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import database
from .database import SessionLocal
from .routers import articles, briefing, channels, fetch_logs, source_health, sources, stories, system, watch_rules
from .seed import seed_sources
from .services.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    database.init_db()
    with SessionLocal() as db:
        seed_sources(db)
    scheduler = None
    if os.environ.get("TESTING") != "1":
        scheduler = start_scheduler()
    yield
    if scheduler:
        stop_scheduler(scheduler)


app = FastAPI(title="NewsDesk MVP", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sources.router, prefix="/api")
app.include_router(source_health.router, prefix="/api")
app.include_router(articles.router, prefix="/api")
app.include_router(fetch_logs.router, prefix="/api")
app.include_router(stories.router, prefix="/api")
app.include_router(watch_rules.router, prefix="/api")
app.include_router(channels.router, prefix="/api")
app.include_router(system.router, prefix="/api")
app.include_router(briefing.router)
