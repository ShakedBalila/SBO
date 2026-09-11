# Foundation validation

Tested on Windows with Node 24, Next.js 16.3.4, Prisma 7.10 and real PostgreSQL 18.4.

- Prisma generation and initial migration applied successfully.
- Optimized production compilation and TypeScript check passed.
- Unit tests cover invalid dates, injected owner IDs, enum validation, timezone boundaries and salted password verification.
- Real API transaction verified with Hebrew text and task activity snapshots.
- Initial Windows database encoding was corrected to UTF-8 without deleting the original database. All table row counts were verified after copying. The current `.env` points to `sbo_utf8`; future new local clusters explicitly initialize UTF-8. The old `sbo` database is retained as a recovery copy.
- Docker Compose is provided but was not executed here because Docker Desktop is not installed. The Node + PostgreSQL route was executed directly.
- Device sizes are tested through a desktop browser at 1440, 768 and 390 pixels; physical iPad/phone and LAN firewall reachability require checks on the actual devices.

The browser integration test passed on 2026-09-11 (6.3 seconds). It creates isolated test accounts and exercises registration/login/logout, persistence after reload, CRUD, filters, cross-user update/delete denial and Origin validation. Desktop, tablet and mobile screenshots were visually inspected; no horizontal overflow was found. See the test source and the latest run result in `test-results/`.
