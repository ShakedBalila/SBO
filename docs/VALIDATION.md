# Foundation validation

## General responsive and module refinement — 2026-09-15

- TypeScript, all ten unit tests, the production build and all four browser suites passed.
- The browser matrix covers 320, 430, 507, 600, 834, 1024, 1440 and 1920 pixel widths across the home, tasks, water, car and nutrition routes. It checks horizontal overflow and bottom-navigation anchoring after scrolling at widths up to 900 pixels.
- The new coverage verifies the seven-day water-history selector, the weekly water summary on the home screen, vehicle-brand artwork fallback, food-bank lookup and gram-based meal form.
- Screenshots for iPhone 15 Pro Max, iPad Split View, iPad full width and desktop were inspected. Physical Safari behavior still needs confirmation on the user's iPhone and iPad after deployment.

## Car feedback validation — 2026-09-14

- Production build, TypeScript and all ten unit tests passed.
- `tests/e2e/car-feedback.spec.ts` verifies actual test-form submission, rejecting fuel above tank capacity (including the exact boundary), license-plate replacement/deletion with the caret at the left edge, backdrop dismissal, and persisted service-reminder settings.
- The browser test checks all five main pages at widths 320, 375, 430, 507, 650, 768, 834, 900, 1024 and 1440; navigation remains at the visual viewport bottom after scrolling at widths up to 900. Insurance fields have equal widths. Screenshots at 430, 507, 834 and 1440 were inspected.
- The service-reminder migration was applied to local PostgreSQL and production Supabase. Production has two enabled push subscriptions and one notification dispatch cron job.
- Reminder timing and the server dispatch path are covered, including treatments, policies and tests. Physical iPad Safari / Split View and receipt of a real push on the user's devices still require live device verification.

Tested on Windows with Node 24, Next.js 16.3.4, Prisma 7.10 and real PostgreSQL 18.4.

- Prisma generation and initial migration applied successfully.
- Optimized production compilation and TypeScript check passed.
- Unit tests cover invalid dates, injected owner IDs, enum validation, timezone boundaries and salted password verification.
- Real API transaction verified with Hebrew text and task activity snapshots.
- Initial Windows database encoding was corrected to UTF-8 without deleting the original database. All table row counts were verified after copying. The current `.env` points to `sbo_utf8`; future new local clusters explicitly initialize UTF-8. The old `sbo` database is retained as a recovery copy.
- Docker Compose is provided but was not executed here because Docker Desktop is not installed. The Node + PostgreSQL route was executed directly.
- Device sizes are tested through a desktop browser at 1440, 768 and 390 pixels; physical iPad/phone and LAN firewall reachability require checks on the actual devices.

The browser integration test passed on 2026-09-11 (6.3 seconds). It creates isolated test accounts and exercises registration/login/logout, persistence after reload, CRUD, filters, cross-user update/delete denial and Origin validation. Desktop, tablet and mobile screenshots were visually inspected; no horizontal overflow was found. See the test source and the latest run result in `test-results/`.
