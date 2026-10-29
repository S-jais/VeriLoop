import urllib.request
import urllib.error
import json

endpoints = [
    ("GET", "/health", None),
    ("GET", "/api/settings", None),
    ("GET", "/api/dashboard", None),
    ("GET", "/api/agents", None),
    ("GET", "/api/evaluations", None),
    ("GET", "/api/failures", None),
    ("GET", "/api/failures/FAIL-RET-101", None),
    ("GET", "/api/failures/genome", None),
    ("GET", "/api/experiments", None),
    ("GET", "/api/evidence", None),
    ("GET", "/api/monitoring", None),
    ("GET", "/api/datasets", None),
    ("GET", "/api/system/health", None),
    ("GET", "/api/system/info", None),
    ("GET", "/api/system/models", None),
    ("GET", "/api/demo/status", None),
    ("GET", "/api/reports/latest", None),
    ("POST", "/api/agents/test-connection", {
        "endpoint_url": "https://httpbin.org/post",
        "http_method": "POST",
        "test_message": "Ping check"
    }),
    ("POST", "/api/evidence/research", {
        "query": "ShopEase return window policy",
        "reason": "Verify policy grounding"
    }),
    ("POST", "/api/failures/FAIL-RET-101/replay", {
        "target_version_name": "Candidate B",
        "save_as_regression_test": False
    })
]

for base in ["http://localhost:8000", "http://localhost:3000"]:
    print(f"\n==================== Testing Base: {base} ====================")
    passed_count = 0
    failed_count = 0
    for method, path, body in endpoints:
        url = base + path
        try:
            data = json.dumps(body).encode("utf-8") if body else None
            headers = {"Content-Type": "application/json"} if body else {}
            req = urllib.request.Request(url, data=data, headers=headers, method=method)
            with urllib.request.urlopen(req, timeout=30) as resp:
                raw = resp.read().decode("utf-8")
                try:
                    parsed = json.loads(raw)
                    summary = f"JSON {type(parsed).__name__}"
                    if isinstance(parsed, list):
                        summary += f" (items={len(parsed)})"
                    elif isinstance(parsed, dict):
                        summary += f" (keys={list(parsed.keys())[:3]})"
                except Exception:
                    summary = f"Text ({len(raw)} bytes)"
                print(f"[PASS {resp.status}] {method} {path:50} -> {summary}")
                passed_count += 1
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")[:150]
            print(f"[FAIL {e.code}] {method} {path:50} -> {err_body}")
            failed_count += 1
        except Exception as e:
            print(f"[ERROR]   {method} {path:50} -> {e}")
            failed_count += 1
    print(f"Summary for {base}: {passed_count} PASSED, {failed_count} FAILED")
