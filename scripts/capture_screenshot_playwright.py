"""Capture a screenshot of NewsDesk using Playwright + local dev servers."""
import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_VENV = PROJECT_ROOT / "backend" / ".venv" / "Scripts" / "python.exe"
FRONTEND_DIR = PROJECT_ROOT / "frontend"
SCREENSHOT_DIR = PROJECT_ROOT / "docs" / "screenshots"
SCREENSHOT_PATH = SCREENSHOT_DIR / "newsdesk-today.png"

BACKEND_URL = "http://127.0.0.1:8000/api/system/status"
FRONTEND_URL = "http://localhost:5173"


def wait_for_url(url: str, timeout: int = 60):
    deadline = time.time() + timeout
    last_err = None
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2) as resp:
                if resp.status == 200:
                    return True
        except Exception as exc:
            last_err = exc
        time.sleep(1)
    print(f"Timed out waiting for {url}: {last_err}")
    return False


def terminate(process: subprocess.Popen):
    if process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)


def main():
    if not BACKEND_VENV.exists():
        print(f"Backend python not found: {BACKEND_VENV}")
        sys.exit(1)

    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

    backend = subprocess.Popen(
        [str(BACKEND_VENV), "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=str(PROJECT_ROOT / "backend"),
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
    )

    try:
        print("Waiting for backend...")
        if not wait_for_url(BACKEND_URL, timeout=60):
            sys.exit(1)

        frontend = subprocess.Popen(
            "npm run dev",
            cwd=str(FRONTEND_DIR),
            shell=True,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
        )

        try:
            print("Waiting for frontend dev server...")
            if not wait_for_url(FRONTEND_URL, timeout=60):
                sys.exit(1)

            # Give React a moment to render and fetch stories.
            time.sleep(4)

            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page(viewport={"width": 1280, "height": 900})
                page.goto(FRONTEND_URL, wait_until="networkidle")
                # Wait for the first story card / hero to appear.
                try:
                    page.wait_for_selector("article", timeout=15000)
                except Exception:
                    print("Warning: no article elements found, capturing current state anyway")
                # Dismiss any toaster to keep screenshot clean.
                page.evaluate("""
                    document.querySelectorAll('[role="status"], [data-sonner-toast]').forEach(el => el.remove());
                """)
                page.screenshot(path=str(SCREENSHOT_PATH), full_page=False)
                browser.close()

            print(f"Saved screenshot to {SCREENSHOT_PATH}")
        finally:
            print("Stopping frontend dev server...")
            terminate(frontend)
            # Also kill any leftover node/vite processes started from frontend dir.
            os.system("taskkill /F /IM node.exe /FI \"WINDOWTITLE eq vite*\" 2>nul")
    finally:
        print("Stopping backend...")
        terminate(backend)
        os.system("taskkill /F /IM uvicorn.exe /T 2>nul")


if __name__ == "__main__":
    main()
