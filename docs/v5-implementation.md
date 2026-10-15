# V5 impact and release plan — 2026-10-15

The approved 15-page specification is an incremental change to the existing Next.js/Prisma application. Existing accounts, journals, workouts, trips and expense attachments remain authoritative.

## Repository mapping and proposed edits

| Scope | Existing implementation | Planned change |
| --- | --- | --- |
| Overview | workspace page, LiveModuleCards, WorkoutOverviewCard, DashboardArt | Remove chevrons, retain links, reserve distinct media/text zones, show saved vehicle plate |
| Tasks/calendar | tasks-workspace, MonthCalendar, ColorWheelPicker, event-colors | Mobile control geometry only, exact persisted event background, contrast-aware foreground, larger existing palette |
| Reminders | notification-schedule, dispatch route, TimePicker | Explicit saved lead only, Israel/DST validation and 24-hour display; preserve scheduler/dispatch identity |
| Vehicle | ModuleWorkspace, VehicleCostSummary | Four equal KPI cards and month-linked fuel spend; retain full-to-full engine and interactive cost chart |
| Workouts | WorkoutsWorkspace, workouts schemas, existing session API | Inline sessions/history under plan/day, genuine week/month navigation, default reps with overrides, plan-specific exercise edits, 60-second new rest and empty notes, standard קראטין switch |
| Work | WorkWorkspace, work-calculations, work API | Contract validation hints; persisted paid/unpaid break segments; leave quick actions; calendar reset on entry; annual Sunday-first week groups; trip expense sublists and unassigned review |
| Food Photo | NutritionWorkspace, existing NutritionEntry and food search | Lazy photo flow, private photos/drafts/recipes, matched ingredient arithmetic, explicit/idempotent grouped journal save, recipe snapshots and reusable suggestions |

## Dependencies and delivery order

1. Capture existing behavior and responsive baseline; audit schema and production source counts.
2. Apply the UI refinements; preserve existing routes and non-conflicting functionality.
3. Implement Workout and Work functional changes with legacy-compatible readers.
4. Implement Food Photo and secured provider adapters, then test local and production flows.
5. Apply additive migrations, run ownership/security checks, publish through the existing GitHub/Vercel connection and verify the public deployment.

Local and production environment **names** were checked without reading/decrypting secret values. No vision or recipe-search provider is configured. AI/search must remain explicitly unavailable behind configuration until a suitable provider is supplied; no paid subscription, API account or billing resource will be provisioned. Photo manual review, ingredient matching, drafts and grouped logging remain usable. No fabricated image recognition or online recipe results.

## Compatibility and migration approach

- Existing workout repTargets and snapshots continue reading unchanged; new UI expands a default repetition target into the same stored array. Existing rest/notes are never normalized in place.
- Existing NutritionEntry records remain unchanged. Grouped meals use the same table/totals with optional structured metadata; drafts and private recipe definitions never count as consumed meals.
- Existing work breakMinutes and pausedAt remain readable. Added break-segment metadata distinguishes paid and unpaid time without rewriting historical timesheets.
- Work trip/expense foreign keys and attachments remain intact. Unassigned expenses get a review bucket, never silent assignment or deletion.
- New tables use owner checks through SBO's existing server session, RLS and revoked public Data API grants. Migrations are additive and idempotent; rollback means reverting code while retaining new data.

## Verification/status

Implementation and local verification are complete. Provider-dependent vision recognition and live recipe discovery are configuration-blocked. Payroll, full leave policy, timesheet UI and document redesign remain explicitly deferred. Physical iPhone/iPad notification delivery cannot be inferred from Chromium viewport tests.

## Provider configuration and privacy

No AI or search provider was provisioned and no billing configuration was changed. Automatic recognition and online recipe discovery are unavailable until a compatible, explicitly approved service is configured. The manual photo-review workflow remains usable alongside barcode/manual food entry.

- Vision requires `FOOD_PHOTO_AI_ENABLED=true`, `FOOD_PHOTO_VISION_URL`, and `FOOD_PHOTO_VISION_KEY`.
- Recipe discovery requires `FOOD_PHOTO_RECIPE_ENABLED=true`, `FOOD_PHOTO_RECIPE_URL`, `FOOD_PHOTO_RECIPE_KEY`, and comma-separated `FOOD_PHOTO_RECIPE_DOMAINS` (exact public source hostnames).
- Optional `FOOD_PHOTO_PROVIDER_NAME` identifies the configured recipient in the confirmation UI. `FOOD_PHOTO_DAILY_LIMIT` defaults to 10 external requests per user per rolling 24 hours and is capped at 30. Disabled services make no requests.
- Adapters accept HTTPS POST endpoints, bearer credentials, `schemaVersion:1`, and Hebrew output. Vision receives normalized images plus dish context only after explicit analysis. Its strict response contains `dishName`, `unknown`, `components` (name, nullable grams, preparation, notes), and up to four questions. It cannot supply nutrient values. Recipe output contains attributed candidate URLs, servings, ingredients and differences; only configured source domains survive validation. Provider endpoints must implement this protocol; arbitrary model keys alone are insufficient.
- The provider adapter validates response shape, disables redirects and retries, times out at 20 seconds, and retains the draft on error. Nutrients are independently matched from the existing food catalog and must be reviewed before logging.
- Uploads are normalized to JPEG with metadata removed, max 1.5 MB stored per image, up to three images per draft and 20 MB per user. Original uploads are never published to a public bucket. Input limit is 3 MB; the browser normally resizes first. Unsupported HEIC produces an actionable JPEG message.
- Unlogged drafts and their photos expire after seven days. Cleanup runs on the owner's draft listing and the existing authenticated notification-dispatch job. Explicitly retained logged images remain private until removed; deselecting retention removes photos during confirmation. Deleting a journal meal removes its linked draft/photos. Data export includes meal/recipe/draft metadata, not private image bytes.
- New tables deny anonymous/authenticated Supabase Data API access. SBO's server session enforces ownership before every operation. Optimistic revision checks protect edits; a transaction lock makes repeated confirmations idempotent. The migration first creates private pre-V5 snapshots of the two extended tables in `sbo_backup`.

## Reproducible manual QA

1. Open Overview at 320×568, 390×844, 507×834, 834×1112 and 1440×900. Check six links, clean media/text separation, saved plate, keyboard focus, no horizontal scroll and bottom navigation while scrolling.
2. Create an event with a light color and an exact Israel alert time. Reopen it in month/week/day views and verify the same fill, readable text, saved time and explicit lead. Change/delete it and verify no stale reminder. Actual iPhone background Push delivery requires an installed PWA and device permission and is not established by viewport automation.
3. In Vehicle, compare four equal KPI tiles, change month, check empty month and partial-fill spend, and edit a refill/wash without changing full-to-full consumption semantics.
4. In Workouts, switch week/month, navigate across months, create a draft exercise (60-second rest, blank notes), override one set's reps, edit plan-specific equipment and cancel a changed draft. Record a real set, reload and find the same session/history under its plan. Toggle and save קראטין; no duplicate scheduler is created.
5. In Work, record start/pause/resume/stop without completing a contract. Reload while paused; verify presence continues while unpaid net freezes, then repeat with paid breaks. Inspect missing-field hints, quick sickness/vacation, calendar re-entry to today, annual week numbers and expense attachments within the correct trip/unassigned bucket.
6. In Nutrition, open צילום אוכל, choose camera/gallery, add/match ingredients, change grams/servings and oil, save/resume a draft, and confirm once. Verify the shared diary totals and grouped editor. Save/reuse/update a personal recipe and confirm older meals remain unchanged. Try unknown food, repeated confirmation, an unavailable provider, and access to another user's draft/photo (must fail).

## Release verification

- Baseline: 21 existing browser scenarios passed before implementation.
- Unit suite: 54 tests passed, including full-to-full fuel, paid/unpaid work segments, legacy break compatibility, annual boundary weeks, portions/provenance, recipe snapshots, event colors and DST gaps.
- TypeScript passed; optimized Webpack build compiled successfully.
- New Food Photo end-to-end scenario passed against real local Postgres, covering shared diary totals, explicit confirmation, retry idempotency, draft/recipe isolation, private normalized image access and deletion.
- Final browser sweep: all 24 scenarios passed (1.7 minutes). The photo scenario and TypeScript were rerun successfully after serializing draft edits and confirmation under the same transaction lock.
- Responsive geometry and screenshots were inspected at 320, 390, 507, 834 and 1440 pixels; media and content do not overlap and the four Vehicle KPIs have equal geometry.
- Production additive migration applied successfully. The seven existing nutrition rows and four work rows were preserved and copied to private snapshots. All five new/live backup tables have RLS enabled and zero public/anon/authenticated grants.
- Supabase advisors report INFO-level notices only: intentional deny-all RLS for server-session-owned tables, existing unindexed foreign keys/unused indexes, and no primary key on immutable backup snapshots. No new permissive Data API policy was added. See [RLS notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) and [backup table notice](https://supabase.com/docs/guides/database/database-linter?lint=0004_no_primary_key).
- Published application commit: `44372ee5e474f6eae65a7394f1e23b91297a960d` on GitHub `main`. Vercel deployment `dpl_ECcVSAy7hkUfaYbYzjPfGLsrDdbu` reached READY and assigned `https://sbo-pi.vercel.app`.
- Live verification passed with temporary QA accounts: unauthenticated requests denied; private image/draft access isolated across users; sourced 200 g rice meal recorded as 260 kcal; two confirmations returned the same journal entry; saved recipe and work break metadata persisted; active workout remained accessible inline.
- Live layout passed at 320/390/507/834/1440 px: six overview links, plate, no media/text overlap or horizontal overflow, equal four Vehicle cards, and fixed bottom navigation after scrolling. All six media assets decoded successfully and the final rendered phone screenshot was inspected. Browser JavaScript errors: zero.
- Streaming page transitions and image decoding require condition-based waits in release automation. An initial immediate geometry read found no tiles while the streamed route was still loading; waiting for four visible tiles passed. Screenshots were retaken after image decode and paint rather than treating a loaded image header as a completed render.
- Temporary production QA accounts were removed after checks; the baseline data was rechecked. Documentation-only follow-up commits do not alter the application code verified above.

## Remaining dependencies and deliberate deferrals

Automatic vision recognition and online recipe discovery are implemented as disabled provider adapters, **not working external integrations**. No provider/key is configured, no images are sent externally, and no paid service was introduced. Manual Food Photo review, sourced nutrition matching, private photos, drafts, personal recipes and grouped journal entries are live. Physical iPhone/iPad Safari behavior and background Push delivery still require device testing. Payroll, full leave-policy, timesheet and document redesign remain outside V5 scope.
