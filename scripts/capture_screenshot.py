"""Capture a screenshot of the running NewsDesk desktop app."""
import os
import subprocess
import sys
import time
from pathlib import Path

try:
    import win32gui
    import win32con
    from PIL import ImageGrab
except ImportError as exc:
    print(f"Missing dependency: {exc}")
    sys.exit(1)


PROJECT_ROOT = Path(__file__).resolve().parents[1]
EXE_PATH = PROJECT_ROOT / "frontend" / "src-tauri" / "target" / "release" / "newsdesk.exe"
SCREENSHOT_DIR = PROJECT_ROOT / "docs" / "screenshots"
SCREENSHOT_PATH = SCREENSHOT_DIR / "newsdesk-today.png"
WINDOW_TITLE = "NewsDesk"
TIMEOUT_SECONDS = 30


def find_window():
    result = []

    def enum(hwnd, _):
        if win32gui.IsWindowVisible(hwnd):
            text = win32gui.GetWindowText(hwnd)
            if WINDOW_TITLE in text:
                result.append(hwnd)

    win32gui.EnumWindows(enum, None)
    return result[0] if result else None


def main():
    if not EXE_PATH.exists():
        print(f"Executable not found: {EXE_PATH}")
        sys.exit(1)

    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Launching {EXE_PATH}...")
    process = subprocess.Popen([str(EXE_PATH)], cwd=str(PROJECT_ROOT))

    try:
        hwnd = None
        for i in range(TIMEOUT_SECONDS):
            hwnd = find_window()
            if hwnd:
                print(f"Window found after {i + 1}s")
                break
            time.sleep(1)

        if not hwnd:
            print("Window not found, falling back to full-screen capture")
            img = ImageGrab.grab()
            img.save(SCREENSHOT_PATH)
            print(f"Saved full-screen screenshot to {SCREENSHOT_PATH}")
            return

        # Give the webview a moment to render content.
        time.sleep(3)

        win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
        try:
            win32gui.SetForegroundWindow(hwnd)
        except Exception:
            pass
        time.sleep(1)

        left, top, right, bottom = win32gui.GetWindowRect(hwnd)
        bbox = (left, top, right, bottom)
        # Add a small padding inside the window border to avoid capturing the frame.
        padding = 8
        inner_bbox = (left + padding, top + padding, right - padding, bottom - padding)
        img = ImageGrab.grab(bbox=inner_bbox)
        img.save(SCREENSHOT_PATH)
        print(f"Saved window screenshot ({img.width}x{img.height}) to {SCREENSHOT_PATH}")
    finally:
        print("Terminating app...")
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)
        # Also clean up any lingering backend sidecar uvicorn on port 8000.
        os.system("taskkill /F /IM newsdesk-backend-x86_64-pc-windows-msvc.exe /T 2>nul")


if __name__ == "__main__":
    main()
