#!/usr/bin/env python3
"""Take Lantern Row's screenshots from the real game in headless Chromium.

Serves game/ on port 18083, opens each URL from shots.json at 1280x720, waits for
window.__shotReady, and saves a JPEG. Run from the repository root.
"""
import json
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PORT = 18083


def wait_for_server(url, timeout=20):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            urllib.request.urlopen(url, timeout=2)
            return True
        except Exception:
            time.sleep(0.5)
    return False


def main():
    shots = json.loads((ROOT / "shots.json").read_text())
    server = subprocess.Popen(
        ["node", "serve.ts", "--port", str(PORT)],
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        if not wait_for_server(f"http://localhost:{PORT}/"):
            print("server did not start", file=sys.stderr)
            return 1
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport={"width": 1280, "height": 720})
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            for shot in shots:
                url = f"http://localhost:{PORT}/?{shot['query'].lstrip('?')}"
                page.goto(url)
                page.wait_for_function("window.__shotReady === true", timeout=30000)
                page.wait_for_timeout(150)
                out = ROOT / "screenshots" / shot["name"]
                page.screenshot(path=str(out), type="jpeg", quality=88)
                print(f"{shot['name']}: {out.stat().st_size} bytes")
            browser.close()
            if errors:
                print("PAGE ERRORS:", file=sys.stderr)
                for e in errors:
                    print(" -", e, file=sys.stderr)
                return 1
        return 0
    finally:
        server.terminate()


if __name__ == "__main__":
    raise SystemExit(main())
