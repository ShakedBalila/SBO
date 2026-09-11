# V3 implementation decisions and remaining work

Source of truth: approved **SBO Product Specification V3** in the referenced conversation “סקירת אפיון אתר”, captured in `V3-reference.md`. The task authorizes a bounded foundation and initial Tasks module, not every feature in V3.

## Implemented in this slice

- Next.js + TypeScript + Tailwind, PostgreSQL + Prisma migration, Docker Compose.
- Account registration/sign in/sign out, hashed passwords, database sessions and server ownership checks.
- Responsive shell with four module links plus Overview on desktop and mobile. Car is directly accessible on mobile instead of an empty More menu.
- Four Main cards, with real aggregate Tasks data and explicit upcoming states for unimplemented modules.
- Task title, description, priority, status, optional due date, search/filter, completion/reopen and transactional activity snapshots.
- Per-user settings scaffold with timezone, locale, enabled module identifiers and unset optional goals.

## Defaults to confirm as product work proceeds

- English UI first; Hebrew and an RTL switch next. Most UI strings still need to move into full locale dictionaries; `src/lib/copy.ts` begins the shared registry.
- Timezone defaults to Asia/Jerusalem; UI settings to edit it are pending.
- Tasks use To do / In progress / Completed, and Low / Medium / High / Urgent. Today means open tasks whose due date is today. Upcoming means a future due date. All includes completed tasks. The dashboard completion ring is all-time, not a daily productivity metric.
- All four module links are visible until onboarding/module preferences are implemented.
- Deleting a task removes it from current lists but retains the last snapshot. This is not an undo or restore implementation.
- Registration is available on the trusted LAN. No email sender, verification or password recovery has been added yet.

## Next increments

1. Complete account lifecycle: email verification, password recovery, account deletion/export, session management, production rate limits by trusted source plus email; expire unused rate-limit rows and sessions. Resolve sign-up error handling for concurrent duplicate emails.
2. Onboarding and editable preferences: module selection, timezone, locale/RTL, units and user-defined goals. Wire module registry and capability policies to preferences.
3. Tasks: planned/start dates separate from due dates, recurrence, notes/category, postponement, week/inbox views, progress, user-visible history, pagination and concurrency conflict handling.
4. Water: owner-scoped logs/goals/containers, quick-add, daily progress and history.
5. Car: vehicles, fuel and calculations, maintenance, insurance/registration dates.
6. Nutrition: personal/global foods with separate permissions, meal logs, calorie/protein goals, favorites; barcode support only once requirements are settled.
7. Notification center, history UI, backup/restore automation, basic analytics.
8. Public launch work: HTTPS/reverse proxy and trusted source configuration, CSP, operational logging, abuse monitoring, backup restore drills, privacy review, capacity and accessibility audits.

Sharing, billing, native apps, marketplace, advanced analytics and full offline mode remain outside this slice. Local-first means a local server and durable database; it does not mean an offline-capable browser app.
