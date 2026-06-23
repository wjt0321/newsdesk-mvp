import os

os.environ["TESTING"] = "1"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import _enable_sqlite_foreign_keys, get_db
from app.main import app
from app.models import Base

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
event.listen(engine, "connect", _enable_sqlite_foreign_keys)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Reassign app.database globals so lifespan/init_db uses the test engine/session
import app.database as database_module
import app.main as main_module
import app.services.scheduler as scheduler_module

database_module.engine.dispose()
database_module.engine = engine
database_module.SessionLocal = TestingSessionLocal
main_module.SessionLocal = TestingSessionLocal
scheduler_module.SessionLocal = TestingSessionLocal


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function", autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="function")
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
