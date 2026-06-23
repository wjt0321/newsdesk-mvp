#!/usr/bin/env python3
"""Functional test for NewsDesk MVP API.

Run with backend started on http://127.0.0.1:8000.
"""

import sys

import httpx

BASE = "http://127.0.0.1:8000"


def check(name: str, condition: bool, detail: str = "") -> bool:
    status = "✅" if condition else "❌"
    print(f"{status} {name}", end="")
    if detail:
        print(f" — {detail}")
    else:
        print()
    return condition


def main() -> int:
    passed = 0
    failed = 0

    try:
        # 1. System status
        r = httpx.get(f"{BASE}/api/system/status", timeout=10)
        ok = check("GET /api/system/status", r.status_code == 200 and not r.json()["paused"])
        passed += ok
        failed += not ok

        # 2. Source health after seed
        r = httpx.get(f"{BASE}/api/source-health", timeout=10)
        ok = check(
            "GET /api/source-health after seed",
            r.status_code == 200 and len(r.json()) == 5,
            f"count={len(r.json())}",
        )
        passed += ok
        failed += not ok

        # 3. Create source
        r = httpx.post(
            f"{BASE}/api/sources",
            json={
                "name": "Functional Test Source",
                "type": "rss",
                "url": "https://feeds.bbci.co.uk/news/rss.xml",
                "category": "test",
            },
            timeout=10,
        )
        source_id = r.json().get("id") if r.status_code == 201 else None
        ok = check("POST /api/sources", r.status_code == 201 and source_id is not None, f"id={source_id}")
        passed += ok
        failed += not ok

        # 4. Source health after create
        r = httpx.get(f"{BASE}/api/source-health", timeout=10)
        data = r.json()
        new_source = next((s for s in data if s["id"] == source_id), None)
        ok = check(
            "GET /api/source-health after create",
            r.status_code == 200 and len(data) == 6 and new_source is not None and new_source["status"] == "degraded",
            f"total={len(data)}, new_status={new_source['status'] if new_source else 'missing'}",
        )
        passed += ok
        failed += not ok

        # 5. Trigger fetch (may fail due to network; we only check it returns)
        r = httpx.post(f"{BASE}/api/sources/{source_id}/fetch", timeout=65)
        ok = check("POST /api/sources/{id}/fetch", r.status_code == 200, f"status={r.json().get('status')}")
        passed += ok
        failed += not ok

        # 6. Fetch logs exist
        r = httpx.get(f"{BASE}/api/fetch-logs", timeout=10)
        ok = check("GET /api/fetch-logs", r.status_code == 200 and len(r.json()) >= 1)
        passed += ok
        failed += not ok

        # 7. Stories endpoint
        r = httpx.get(f"{BASE}/api/stories?limit=10", timeout=10)
        ok = check("GET /api/stories", r.status_code == 200)
        passed += ok
        failed += not ok

        # 8. Channels endpoint
        r = httpx.get(f"{BASE}/api/channels", timeout=10)
        ok = check("GET /api/channels", r.status_code == 200)
        passed += ok
        failed += not ok

        # 9. Watch rules CRUD
        r = httpx.post(
            f"{BASE}/api/watch-rules",
            json={"name": "Test Rule", "keywords": "test", "enabled": True},
            timeout=10,
        )
        rule_id = r.json().get("id") if r.status_code == 201 else None
        ok = check("POST /api/watch-rules", r.status_code == 201 and rule_id is not None)
        passed += ok
        failed += not ok

        if rule_id:
            r = httpx.get(f"{BASE}/api/watch-rules/{rule_id}/stories", timeout=10)
            ok = check("GET /api/watch-rules/{id}/stories", r.status_code == 200)
            passed += ok
            failed += not ok

    except Exception as exc:
        print(f"❌ Functional test exception: {exc}")
        failed += 1

    print(f"\nFunctional test result: {passed} passed, {failed} failed")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
