# SBO Nutrition upgrade

## Product decisions

- All food values use a 100 gram basis.
- The diary has no meal category and no eating time.
- The account timezone defines the nutritional day on every device.
- Existing barcode scanning stays available.
- Nutrition targets are calculated from the profile and can be overridden manually.
- Existing diary entries remain unchanged and continue to be editable.

## Free data sources

1. Personal SBO foods, owned by the signed-in user.
2. Favorites and recently used foods.
3. Israel Ministry of Health national nutrition dataset, bundled locally for fast Hebrew search.
4. USDA FoodData Central as a complementary API.
5. Open Food Facts for packaged products and barcodes.

No paid API or subscription is introduced.

## Data design

- `NutritionEntry` remains the immutable nutrition snapshot for the date it was eaten.
- `UserFood` stores a user's reusable foods normalized to 100 grams.
- `FoodPreference` stores favorites, use count and last use without duplicating catalog data.
- External food keys are stable strings such as `moh:123`, `usda:456`, and `off:729...`.

## Delivery sequence

1. Import and normalize Ministry of Health food data.
2. Add personal food and preference persistence.
3. Replace the nutrition screen with the mobile-first daily diary.
4. Add ranked type-ahead search and quantity calculation.
5. Add manual food creation, favorites, edit/delete and barcode flow.
6. Verify migration, API ownership checks, calculations, iPhone and split-screen layout.

## Source provenance

The Ministry of Health dataset is the open `nutrition-database` package on data.gov.il. The importer keeps the official item code and update date and emits only the fields needed by this version of SBO.
