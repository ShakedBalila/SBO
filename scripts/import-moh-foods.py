import csv
import json
import sys
from pathlib import Path


def number(value: str) -> float:
    try:
        return round(float(value or 0), 1)
    except ValueError:
        return 0


source = Path(sys.argv[1])
target = Path(sys.argv[2])
foods = []

with source.open(encoding="utf-8-sig", newline="") as stream:
    for row in csv.DictReader(stream):
        name = (row.get("shmmitzrach") or "").strip()
        code = (row.get("Code") or "").strip()
        if not name or not code:
            continue
        foods.append({
            "id": f"moh:{code}",
            "name": name,
            "aliases": [value for value in [(row.get("english_name") or "").strip()] if value],
            "calories": round(number(row.get("food_energy", ""))),
            "proteinG": number(row.get("protein", "")),
            "carbsG": number(row.get("carbohydrates", "")),
            "fatG": number(row.get("total_fat", "")),
            "updatedAt": (row.get("tarich_idkun") or "").strip(),
        })

foods.sort(key=lambda food: food["name"])
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(foods, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"Wrote {len(foods)} foods to {target}")
