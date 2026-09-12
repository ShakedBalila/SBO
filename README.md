# SBO

A local-first personal dashboard built from the approved **SBO Product Specification V3**. Next.js App Router + TypeScript + Tailwind CSS, PostgreSQL, Prisma, and a responsive desktop sidebar / mobile bottom navigation.

## What works

- Personal accounts: register, sign in and sign out; salted scrypt password hashes and revocable, seven-day database sessions.
- Main Dashboard with four live module cards. New records are added from each module dashboard.
- Time and task management: Sunday–Saturday monthly calendar, Israeli holidays, task/event editing from the calendar, multi-day ranges, yearly and custom recurrence, per-user event templates, colored events, fixed-height task list and week-number navigation.
- Water: persistent daily goal, quick add, editable history, daily totals and a body-shaped visual progress meter.
- Car: vehicles and tank capacity, online Israel 95-octane price, fuel range/actual distance, insurance, maintenance/test reminders, additional expenses and a six-month cost chart.
- Nutrition: camera barcode scanning through Open Food Facts, quantity-scaled nutrients, editable food history and automatic BMR/TDEE/calorie/protein recommendations.
- Installable PWA metadata and same-device browser notifications for reminders. On iPhone/iPad, add SBO to the Home Screen and allow notifications. Reliable delivery while SBO is fully closed will require a future server-side Web Push sender.
- Data persists in PostgreSQL and is available to the same account on other devices. Tasks refresh on navigation, page reload and window focus; this is not live push sync or offline storage.
- Every task read and mutation is scoped to the authenticated account on the server. Task activity snapshots are written in the same transaction as changes and retained on task deletion.
- Empty, loading, validation, connection error and deletion confirmation states.

The application interface is Hebrew and uses a full RTL layout.

## Public deployment — GitHub, Vercel and Supabase

The production architecture uses Vercel for the Next.js server and Supabase PostgreSQL for persistent data. Localhost remains available only for development; users open the public HTTPS Vercel URL from any network without Tailscale.

1. Create an empty Supabase project and copy its pooled connection URL to `DATABASE_URL` and its direct connection URL to `DIRECT_URL`.
2. Apply the schema to the new project with `DIRECT_URL` set: `pnpm db:migrate`.
3. Copy the existing local users and records with `SOURCE_DATABASE_URL` pointing to the local database and `TARGET_DATABASE_URL` pointing to the Supabase direct URL: `pnpm db:migrate-data`. Password hashes are preserved; active local sessions are intentionally omitted.
4. Push the repository to GitHub and import it into Vercel.
5. Add `DATABASE_URL`, `COOKIE_SECURE=true`, `SUPABASE_CA_CERT=bundled` and, for migrations outside Vercel, `DIRECT_URL` to the deployment environment. Same-origin Vercel requests are trusted automatically.

Do not commit `.env` or database credentials. The production URL becomes the only address needed by phones, tablets and computers.

## Quick start — Docker Compose

Install Docker Desktop and start its engine. From this directory:

```powershell
Copy-Item .env.example .env
docker compose up --build -d
```

Before starting, change `POSTGRES_PASSWORD` in `.env` to a unique URL-safe password (letters and digits avoid connection URL escaping). Keep the password in `DATABASE_URL` consistent if also running Node on the host. Compose uses `POSTGRES_PASSWORD` for its internal database URL. Migrations run automatically before the app starts.

Open **http://localhost:3000** and select **Create an account**. No default account or seeded password exists.

```powershell
docker compose logs -f app
docker compose stop
docker compose start
```

The named `sbo_postgres` volume preserves data. `docker compose down` preserves it too; **do not add `--volumes` unless you intend to erase your database**. Run `docker compose up --build -d` after code updates to rebuild and apply new migrations.

## Development — Node with PostgreSQL

Use Node **22.13+ or 24 LTS** and **pnpm 11.19.0**. The lockfile pins the installed dependencies.

The `.env` copy below is for a fresh checkout only. Keep an existing `.env` when returning to this project; it contains the connection to your current database.

```powershell
corepack enable
corepack prepare pnpm@11.19.0 --activate
Copy-Item .env.example .env
pnpm install --frozen-lockfile
pnpm db:generate
```

If Docker is installed, start only the database:

```powershell
docker compose up -d db
```

Alternatively, the project includes an optional development-only PostgreSQL runner:

```powershell
pnpm db:local
```

Keep that terminal open. This runs real PostgreSQL, listening only on `127.0.0.1`, and stores the cluster in `.local/postgres`. Ctrl+C stops it without erasing data. It supports the platforms provided by `embedded-postgres`; on Linux run as a normal user, not root. Do not run it alongside Docker PostgreSQL on the same port. Do not delete `.local` or change its configured database credentials after initialization without migrating your data.

In another terminal:

```powershell
pnpm db:migrate
pnpm dev
```

Open **http://localhost:3000**. For a production build on the host, stop the development server, run `pnpm build`, then `pnpm start`. Docker uses Next.js standalone output directly.

## Phone / iPad / other computer on your LAN

1. Connect both devices to the same trusted home network. Keep the host PC and database running.
2. Run `ipconfig` on the PC and find the IPv4 address of its active Wi-Fi/Ethernet adapter, for example `192.168.1.50`.
3. Add that exact origin to `.env`:

   ```dotenv
   APP_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://192.168.1.50:3000
   COOKIE_SECURE=false
   ```

4. Restart the Node server, or run `docker compose up -d app` to recreate the container with the updated environment.
5. Open `http://192.168.1.50:3000` on the other device and sign in to the same account. `localhost` on the phone refers to the phone itself.
6. If Windows Firewall prompts for Node/Docker, allow access on **Private networks**. No firewall or router settings are changed automatically. If connection still fails, check guest Wi-Fi isolation and that both devices are on the same subnet.

For temporary development through a private overlay network, add the PC's exact overlay URL as well. Production use should rely on the public HTTPS deployment described above.

The app binds to `0.0.0.0:3000`. PostgreSQL's host port is bound to loopback only. Do not forward router ports for this local alpha. The origin allowlist protects mutations; update it if the PC's LAN address changes. Cookies on HTTP use `Secure=false` for LAN development; a future public deployment must use HTTPS and `COOKIE_SECURE=true`.

## Project structure

```text
src/app/(workspace)/       Protected shell, dashboard, Tasks, module previews
src/app/login/             Registration / login UI
src/app/api/auth/          Account and session endpoints
src/app/api/tasks/         Authenticated task CRUD
src/components/            Shared responsive navigation
src/lib/                   Database, sessions, password hashing, validation, copy
prisma/schema.prisma       User, settings, sessions, tasks, task events, rate limits
prisma/migrations/         Versioned SQL migrations
scripts/local-db.mjs       Optional local development PostgreSQL
tests/                     Unit and browser/integration tests
docs/                      V3 reference and development decisions
```

## Data and architecture

- The server is the source of truth. No domain records or session tokens are stored in localStorage.
- `userId` comes from a validated session, never from form input. Both reads and writes enforce ownership, including guessed task IDs.
- Sessions use 256-bit random tokens, store only SHA-256 token hashes in the database and use HttpOnly / SameSite=Lax cookies.
- Mutating endpoints require an exact trusted Origin. Inputs have server-side limits and enum/date validation. Login/register attempts are limited per normalized account email in PostgreSQL (10 attempts per 15 minutes).
- Dates without times are PostgreSQL `DATE` values. Instants are UTC; Today/Overdue use the account timezone, initially `Asia/Jerusalem`.
- Settings already reserve per-user locale, timezone, modules and optional goals. There are no universal health targets or fabricated readings.
- The schema does not prematurely model all future modules. Add owner-scoped tables when implementing each module; global foods and private foods will need distinct access policies.
- `TaskEvent` intentionally has no task foreign key so deletion keeps the activity snapshot. Account deletion can cascade through events; the user-facing deletion/export flow is still to be built.

## Background notifications

Push notifications use a per-device Web Push subscription, so the browser tab does not need to stay open. Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `DISPATCH_SECRET` in the production environment. Call `POST /api/notifications/dispatch` every minute with `Authorization: Bearer <DISPATCH_SECRET>`; the production setup uses Supabase Cron with `pg_net`. On iPhone and iPad, install SBO to the Home Screen before enabling notifications. Each device must enable the notification toggle once.

## Checks

With dependencies generated:

```powershell
pnpm test
pnpm typecheck
pnpm build
```

For browser and real-database integration tests, start PostgreSQL, apply migrations and run the app on port 3000, then:

```powershell
pnpm exec playwright install chromium
pnpm exec playwright test
```

On Windows you may use installed Edge without downloading a test browser:

```powershell
$env:PLAYWRIGHT_EXECUTABLE_PATH='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
pnpm exec playwright test
```

Tests create uniquely named `example.test` accounts and clean up only those accounts. They exercise persisted CRUD, task history, cross-account read/update/delete denial, rejected origins, invalid dates, login/logout, search and mobile navigation. Screenshots go to ignored `test-results/`.

## Backups

There is no automatic backup scheduler in this foundation. For Docker, take a manual logical backup without PowerShell binary redirection:

```powershell
docker compose exec db pg_dump -U sbo -d sbo -Fc -f /tmp/sbo.backup
docker compose cp db:/tmp/sbo.backup ./sbo.backup
```

Keep backups outside the source repository and protect them as private data. Test restoration into a **new empty database**, rather than overwriting your active data. For `db:local`, use a compatible PostgreSQL 18 `pg_dump` client against the same `DATABASE_URL`; the raw `.local/postgres` directory is not a portable backup while the server is running.

## Remaining V3 work

See [the roadmap](docs/ROADMAP.md). This is the requested foundation and Tasks slice, **not the full public MVP**. Public readiness is architectural; email verification/reset, onboarding, production abuse protection, backup automation, deployment hardening and privacy/export/deletion flows must be completed before a public launch.

Reference docs: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Prisma 7 configuration](https://docs.prisma.io/docs/guides/upgrade-prisma-orm/v7), [embedded PostgreSQL](https://github.com/leinelissen/embedded-postgres).
