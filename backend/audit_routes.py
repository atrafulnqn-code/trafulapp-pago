import os
import re

backend_file = "backend/app.py"
frontend_dir = "frontend/src"

routes = set()
try:
    with open(backend_file, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            if "@app.route" in line:
                m = re.search(r"@app\.route\(['\"]([^'\"]+)['\"]", line)
                if m:
                    routes.add(m.group(1))
except Exception as e:
    print("Error reading app.py:", e)

with open('backend/backend_audit.txt', 'w', encoding='utf-8') as out:
    out.write("Backend endpoints mapping:\n")
    for r in sorted(list(routes)):
        out.write(r + "\n")

    out.write("\n--------------------------\nFrontend fetch mapping:\n")
    for root, _, files in os.walk(frontend_dir):
        for filename in files:
            if filename.endswith(".tsx") or filename.endswith(".ts"):
                path = os.path.join(root, filename)
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as f:
                        for line in f:
                            if "fetch(" in line or "axios" in line:
                                m = re.search(r"fetch\(['\"`]?(?:https?://[^'\"`]+|[^'\"`]*\$\{API_BASE_URL\})?([^'\"`\?]*)", line)
                                if m:
                                    out.write(f"{filename}: {m.group(1).strip()}\n")
                except:
                    pass
