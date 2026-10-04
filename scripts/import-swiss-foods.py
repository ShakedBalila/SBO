"""Import the official FSVO 7.1 download; openpyxl is needed only for this script.

Source: https://naehrwertdaten.ch/wp-content/uploads/2026/07/Schweizer_Nahrwertdatenbank.xlsx
Free reuse with attribution: https://webapp.prod.blv.foodcase-services.com/de/downloads/
Usage: python scripts/import-swiss-foods.py downloaded.xlsx
"""
import json
import sys
from pathlib import Path
import openpyxl

workbook = openpyxl.load_workbook(sys.argv[1], read_only=True, data_only=True)
foods = []
for sheet in workbook.worksheets[:2]:
    rows = list(sheet.values)
    headers = rows[2]
    columns = [headers.index(name) for name in (
        'Energie, Kilokalorien (kcal)', 'Protein (g)',
        'Kohlenhydrate, verfügbar (g)', 'Fett, total (g)')]
    for row in rows[3:]:
        if not row[0] or not row[3] or '100g' not in str(row[7]):
            continue
        # Unknown macro values are not zero. Exclude incomplete entries.
        if not all(isinstance(row[index], (int, float)) for index in columns):
            continue
        foods.append(dict(id=f'swiss:{row[0]}', name=row[3],
                          **dict(zip(('calories', 'proteinG', 'carbsG', 'fatG'),
                                     (round(row[index], 1) for index in columns)))))
target = Path(__file__).resolve().parents[1] / 'src/data/swiss-foods.json'
target.write_text(json.dumps(foods, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f'Imported {len(foods)} complete foods per 100g from FSVO 7.1.')
