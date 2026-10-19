# Focused mobile overview correction

The existing six cards share one CSS grid at widths up to 650px: a reserved title row, followed by a left media column and a right RTL data column with a 6px gap. Media and its fade are contained in their grid cell and clipped inside the existing rounded gold border. Existing headings, image assets, statistics, values, destinations and card ordering remain in place. No module, navigation, database or desktop styles are changed.

Authenticated browser verification uses records saved in a localhost-only test account, including 1,200/2,000 ml water, 1,650 kcal, 105g protein, today's work/tasks/events and a vehicle license plate. No production user records or placeholder UI are used.

Before/after captures and geometry checks passed at 320, 375, 390 and 430px. All six cards retained their exact outer positions and dimensions, gold border styles, data, image URLs and navigation targets. Media/overlay bounds stay below titles and left of content, with equal paired card heights and no horizontal page overflow. Navigation clicks for all six modules passed. The 1440px desktop screenshot was byte-for-byte identical to its before image, and all desktop geometry was unchanged. The bottom navigation geometry and text also matched each baseline.

Screenshots were inspected at 320 and 390px, including Water, Vehicle and Workouts. Local audit captures live in `.tools/dashboard-card-zones/`; they are excluded from Git. `tests/e2e/dashboard-card-zones.spec.ts` runs independently; optional `SBO_CARD_LAYOUT_PHASE=before` / `after` modes support comparisons when capturing a future controlled baseline.
