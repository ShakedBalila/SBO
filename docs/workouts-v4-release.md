# SBO V4 — Workouts and dashboard

Implemented against `SBO_V4_Workouts_Dashboard_Combined_Codex_Spec.pdf` (19 pages), including its retained modal, task, water and vehicle requirements.

## Behavior

- `/workouts` separates editable, versioned plans from performed sets. A session retains its original prescription snapshot; editing future targets never changes past results. Per-set repetitions, decimal kilograms, completion, warmup, RIR and notes can be corrected explicitly.
- The Sun/Tue/Thu starter is an inactive draft requiring review. Proposed targets are labeled; measured weights remain empty. Optional walking stays on Monday/Wednesday. The next-workout summary follows moved dates and excludes completed/skipped occurrences.
- Sessions support partial completion, pause/resume, set and exercise changes, rest controls and revision conflicts. Failed saves retain a recoverable local draft when device storage is available and clearly report unsaved work otherwise.
- Existing workout tasks/events are shown for review. Only an explicit user action links/hides them; original records are retained. Explicitly linked one-time records follow a session reschedule. Recurring sources cannot be silently moved as a whole; completed sessions cannot be moved to another date.
- Creatine uses the existing reminder-enabled/time fields and dispatch identity. Its controls now live in Workouts; old screen links lead there. Dosage is optional text. Nutrition is a read-only view of the existing diary/goals for the selected date.
- The dashboard has six cards in three paired rows and seven direct navigation targets. Car shows its nearest relevant expiry; Workouts shows the next session and weekly completion count. Images remain decorative and separate from metrics.
- Shared modal spacing is compact, fields remain 44–48 px high and long forms retain reachable footer actions. Mobile task selection and completion are separate 44 px targets with a divider; desktop controls retain their prior arrangement. The Water pace disclosure is centered.
- Vehicle refueling history precedes supporting expenses, and the cost chart is last. The redundant monthly fuel-economy chart/KPI is removed; full-to-full cycles remain. “עלות הדלק בחודש” includes actual fuel payments, including partial fills, for the selected month. Legend filtering only changes visible chart segments/totals, never official expense totals.

## Import, export and media

PDF text, DOCX, XLSX, CSV and JSON imports first return a review preview with no writes. Structured exercise rows and Hebrew/English day headings are supported. Unrecognized fields remain empty or flagged; invalid/scanned PDFs report that transcription is needed. No OCR or paid parsing service is used. Maximum source file: 5 MB; compressed-office input has expanded-size/entry limits.

Confirmed imports are transactional, create inactive draft copies and deduplicate repeated backups. JSON preserves plan snapshots and actual sets separately; CSV/XLSX identify PLAN and ACTUAL rows. Kilograms and timezone are explicit. Private exercise images are excluded from backup payloads and must be reattached.

Serverless PDF loading explicitly initializes the packaged worker data and canvas factory before the parser. These packages remain server externals, following the [parser's deployment guidance](https://github.com/mehmet-kozan/pdf-parse/blob/main/docs/troubleshooting.md), so no CDN worker or paid service is needed.

The built-in exercise library deliberately uses neutral equipment placeholders and general guidance where verified media is unavailable. Personal JPEG/PNG/WebP uploads (up to 2 MB) require owner access; SVG is rejected. Optional demonstration links open trusted HTTPS YouTube/Vimeo providers externally. Missing videos are labeled, with no invented links.

Dashboard dumbbell photo: [Pexels — close-up of a black dumbbell](https://www.pexels.com/photo/close-up-shot-of-a-black-dumbbell-8032962/). Served locally as `public/overview-workouts.webp`; no external image service is required at runtime.

## Data and verification

`20261013192448_workouts_v4.sql` adds four owner-scoped tables and the optional creatine dosage field. Applied locally and to production. Existing settings/accounts/records are preserved. All new tables have RLS enabled and no SELECT grants for anon/authenticated Data API roles; SBO's server session enforces ownership on each request, including private images and exports.

Validation: TypeScript, production Webpack build, 46 unit tests and 21 browser integration tests. Coverage includes failed-save recovery across reload, revision conflicts, explicit source rescheduling, partial history, future-plan isolation, all five import formats, repeated JSON restore, private media, cross-user denial, cost-filter independence and existing modules.

Responsive browser coverage includes widths 320, 375, 390, 430, 507, 768, 834, 1280, 1440 and 1920. The six dashboard cards fit tested viewports without horizontal overflow, and navigation remains fixed after scrolling/resizing. Long forms stay bounded with internal scrolling. Shared existing suites cover task/event, nutrition, insurance/vehicle and work dialogs; no content was removed solely to reduce height.

These are Edge/Chromium viewport checks. Physical iPhone/iPad Safari, keyboard behavior and receipt of a real push notification on the user's device remain device checks. Rest timing uses an absolute deadline while the screen is available; background audio is not promised.
