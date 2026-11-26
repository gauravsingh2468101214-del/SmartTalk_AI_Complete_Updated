import json
import shutil
from pathlib import Path

path = Path("knowledge_base/products.json")
backup = Path("knowledge_base/products_before_smart_features_backup.json")

if not backup.exists():
    shutil.copy2(path, backup)

with path.open("r", encoding="utf-8") as f:
    data = json.load(f)

series = next((s for s in data["series"] if s["id"] == "smart"), None)

if series is None:
    raise SystemExit("ERROR: Smart series not found.")

features = [
    "All-in-one Design: Highly integrated unified design with one-line connection.",
    "Intelligent Dual System: Built-in Android system with optional OPS computer.",
    "Wireless Projection: Supports screen sharing from PC, Android and iOS devices, with up to 9-screen display.",
    "Intelligent Writing: Supports single-finger writing, two-finger scaling, multi-finger roaming and hand-back erasure.",
    "COB LED: High protection, high reliability, high definition and excellent picture quality."
]

notes = series.setdefault("notes", [])

for feature in features:
    if feature not in notes:
        notes.append(feature)

with path.open("w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.write("\n")

print("SUCCESS: Smart series updated.")
print("Features:", len(features))
print("Backup:", backup)
