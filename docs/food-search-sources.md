# Automatic food search

Every query of at least two characters searches the personal user database,
the Ministry of Health catalog and Swiss FSVO catalog, alongside concurrent
USDA and Open Food Facts requests. The UI debounces typing by 300 ms and
cancels superseded requests. Upstream failures preserve available results
and name unavailable providers. Nothing requires a paid subscription.

Local Hebrew items take priority, followed by Hebrew Open Food Facts items.
Barcode matches and identical normalized names with matching macros are
deduplicated. All nutrition values represent 100 grams.

## Sources

- Israeli Ministry of Health: existing `src/data/moh-foods.json`.
- Personal SBO foods: user-owned `UserFood` records.
- USDA FoodData Central: Foundation, Branded, SR Legacy and Survey (FNDDS).
  `USDA_FDC_API_KEY` can hold a free data.gov key. Without it the existing
  `DEMO_KEY` fallback has tighter shared limits. See the official
  [API guide](https://fdc.nal.usda.gov/api-guide/).
- Open Food Facts: free public search, original Hebrew query preserved,
  with Hebrew product names preferred. Existing barcode lookup remains.
- Swiss Food Composition Database, FSVO/BLV, version 7.1 (July 2026):
  1,232 complete entries per 100 g in `src/data/swiss-foods.json`.
  The published workbook used here contains German names; common ingredient
  queries are mapped to German search terms. No invented Hebrew names or
  unknown macro values are inserted. Regenerate using
  `python scripts/import-swiss-foods.py downloaded.xlsx` (openpyxl required).
  [Official download and free reuse terms](https://webapp.prod.blv.foodcase-services.com/de/downloads/),
  [source workbook](https://naehrwertdaten.ch/wp-content/uploads/2026/07/Schweizer_Nahrwertdatenbank.xlsx).

EuroFIR FoodEXplorer is not integrated: its general access is a membership
benefit and redistribution can require approval. The user's no-cost
requirement takes precedence over treating it as an unrestricted public API.
[Official access terms](https://www.eurofir.org/our-tools/foodexplorer/).
