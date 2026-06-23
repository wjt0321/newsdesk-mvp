#!/usr/bin/env python3
"""Backend smoke test for NewsDesk MVP.

Starts the FastAPI backend, exercises the main API endpoints, then shuts the
server down. Run from the project root with the backend virtual environment:

    cd newsdesk-mvp
    backend/.venv/Scripts/python scripts/smoke_test.py
"""

import os
import subprocess
import sys
import time

import httpx

BACKEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
BASE_URL = "http://127.0.0.1:8000"


def wait_for_server(timeout: float = 30.0) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            response = httpx.get(f"{BASE_URL}/api/sources", timeout=2.0)
            if response.status_code == 200:
                return True
        except Exception:
            pass
        time.sleep(0.5)
    return False


def run_checks() -> tuple[list[str], list[str]]:
    passed: list[str] = []
    failed: list[str] = []

    def check(name: str, condition: bool) -> None:
        if condition:
            passed.append(name)
        else:
            failed.append(name)

    response = httpx.get(f"{BASE_URL}/api/system/status", timeout=10.0)
    check("GET /api/system/status", response.status_code == 200 and response.json().get("paused") is False)

    response = httpx.get(f"{BASE_URL}/api/sources", timeout=10.0)
    sources = response.json() if response.status_code == 200 else []
    check("GET /api/sources", response.status_code == 200 and len(sources) > 0)

    source_id = sources[0]["id"] if sources else None

    response = httpx.post(f"{BASE_URL}/api/system/pause", timeout=10.0)
    check("POST /api/system/pause", response.status_code == 200 and response.json().get("paused") is True)

    response = httpx.post(f"{BASE_URL}/api/system/resume", timeout=10.0)
    check("POST /api/system/resume", response.status_code == 200 and response.json().get("paused") is False)

    if source_id:
        response = httpx.post(f"{BASE_URL}/api/sources/{source_id}/fetch", timeout=60.0)
        check(f"POST /api/sources/{source_id}/fetch", response.status_code == 200)

    response = httpx.get(f"{BASE_URL}/api/fetch-logs", timeout=10.0)
    check("GET /api/fetch-logs", response.status_code == 200)

    response = httpx.get(f"{BASE_URL}/api/source-health", timeout=10.0)
    check("GET /api/source-health", response.status_code == 200 and isinstance(response.json(), list))

    response = httpx.get(f"{BASE_URL}/api/stories?limit=10", timeout=10.0)
    stories = response.json() if response.status_code == 200 else []
    check("GET /api/stories", response.status_code == 200)

    response = httpx.get(f"{BASE_URL}/api/channels", timeout=10.0)
    check("GET /api/channels", response.status_code == 200)

    response = httpx.get(f"{BASE_URL}/api/watch-rules", timeout=10.0)
    check("GET /api/watch-rules", response.status_code == 200)

    response = httpx.get(f"{BASE_URL}/api/briefing", timeout=10.0)
    check("GET /api/briefing", response.status_code == 200 and "plain_text" in response.json())

    if stories:
        story_id = stories[0]["id"]
        response = httpx.get(f"{BASE_URL}/api/stories/{story_id}/diff", timeout=10.0)
        check(f"GET /api/stories/{story_id}/diff", response.status_code == 200 and "articles" in response.json())

    return passed, failed


def main() -> int:
    env = os.environ.copy()
    env.pop("TESTING", None)

    print(f"Starting backend from {BACKEND_DIR} ...")
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=BACKEND_DIR,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )

    try:
        if not wait_for_server():
            print("ERROR: backend failed to start within timeout")
            output, _ = proc.communicate(timeout=5)
            if output:
                print(output.decode(errors="replace"))
            return 1

        print("Backend is up. Running smoke checks ...")
        passed, failed = run_checks()

        for name in passed:
            print(f"  OK   {name}")
        for name in failed:
            print(f"  FAIL {name}")

        if failed:
            print(f"\nSmoke test FAILED ({len(failed)} checks).")
            return 1

        print(f"\nSmoke test PASSED ({len(passed)} checks).")
        return 0
    finally:
        print("Shutting down backend ...")
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait(timeout=5)


if __name__ == "__main__":
    sys.exit(main())
