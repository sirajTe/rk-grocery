import os
import shutil
import tempfile

import mongomock
import pymongo
import pytest

# In-memory MongoDB, so tests don't need a running server. Set TEST_MONGODB_URL to run against a real one.
if not os.environ.get("TEST_MONGODB_URL"):
    pymongo.MongoClient = mongomock.MongoClient
os.environ["MONGODB_URL"] = os.environ.get("TEST_MONGODB_URL", "mongodb://localhost:27017")
os.environ["MONGODB_DB"] = f"rketech_test_{os.getpid()}"
_tmp = tempfile.mkdtemp()
os.environ["UPLOAD_DIR"] = f"{_tmp}/uploads"
os.environ["SECRET_KEY"] = "test-secret"

from fastapi.testclient import TestClient  # noqa: E402

from app.db import client as mongo  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c
    mongo.drop_database(os.environ["MONGODB_DB"])
    shutil.rmtree(_tmp, ignore_errors=True)


@pytest.fixture(scope="session")
def admin(client):
    r = client.post("/api/admin/login", json={"email": "RKETECH9896@gmail.com", "password": "Rketech@2026"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
