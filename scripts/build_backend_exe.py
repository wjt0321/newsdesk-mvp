#!/usr/bin/env python3
"""Build the Python backend as a standalone executable for Tauri sidecar.

Run from the project root with the backend virtual environment:

    cd newsdesk-mvp
    backend/.venv/Scripts/python scripts/build_backend_exe.py

Requirements:
    backend/.venv/Scripts/python -m pip install -e "backend/.[build]"

Output:
    frontend/src-tauri/sidecars/newsdesk-backend-x86_64-pc-windows-msvc.exe

Next steps:
1. The script copies the executable to frontend/src-tauri/sidecars/ with the
   target-triple suffix required by Tauri.
2. Build the Tauri app with `cd frontend && npm run tauri:build`.
"""

import os
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")


def main() -> int:
    os.chdir(BACKEND_DIR)

    # Ensure PyInstaller is available.
    try:
        import PyInstaller  # noqa: F401
    except ImportError:
        print("PyInstaller not found. Installing backend[build]...")
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "-e", ".[build]"],
            cwd=BACKEND_DIR,
        )

    # Create a minimal entry point script if it doesn't exist.
    entry_path = Path(BACKEND_DIR) / "pyinstaller_entry.py"
    entry_path.write_text(
        """import uvicorn
from app.main import app

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
""",
        encoding="utf-8",
    )

    cmd = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--onefile",
        "--noconsole",
        "--name",
        "newsdesk-backend",
        "--distpath",
        "dist",
        "--workpath",
        "build/pyinstaller",
        "--specpath",
        "build/pyinstaller",
        "--add-data",
        f"{os.path.join(BACKEND_DIR, 'app')}{os.pathsep}app",
        str(entry_path),
    ]

    print("Building backend executable...")
    print(" ".join(cmd))
    result = subprocess.call(cmd)
    if result == 0:
        built_exe = Path(BACKEND_DIR) / "dist" / "newsdesk-backend.exe"
        sidecars_dir = Path(PROJECT_ROOT) / "frontend" / "src-tauri" / "sidecars"
        sidecars_dir.mkdir(exist_ok=True)
        # Tauri expects the sidecar filename to include the target triple.
        sidecar_exe = sidecars_dir / "newsdesk-backend-x86_64-pc-windows-msvc.exe"
        import shutil
        shutil.copy2(built_exe, sidecar_exe)
        print(f"Build successful: {built_exe}")
        print(f"Copied to Tauri sidecar: {sidecar_exe}")
        print("Build the Tauri app with `cd frontend && npm run tauri:build`.")
    else:
        print("Build failed.")

    return result


if __name__ == "__main__":
    sys.exit(main())
