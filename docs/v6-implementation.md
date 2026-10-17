# V6 implementation and verification ledger

## Approved decisions

- Preserve existing accounts, ownership, all V5 features and saved Food Photo drafts.
- Provision the single Admin by confirmed immutable user ID, never by a runtime email comparison.
- Tasks overview remains half-width; its metrics are horizontal.
- No paid services, purchased domains, automatic drafts, inbox, or 2FA.

## Audit (17 October 2026)

Existing stack: Next.js App Router, Prisma/Postgres on Supabase, custom opaque-cookie sessions and scrypt passwords, Web Push, private server-authorized uploads. Production has two accounts. Existing entities have user ownership and vehicle child relations use composite ownership keys. Settings and onboarding are currently minimal; registration is public. Work uses one mutable contract and navigation is hardcoded. Push subscriptions currently lack session binding. Existing account and module data must survive the migration.

Entry points: `src/lib/auth.ts`, `src/app/api/auth/[action]/route.ts`, `src/app/api/security/[action]/route.ts`, `src/components/settings-workspace.tsx`, `src/components/navigation.tsx`, `src/lib/module-data.ts`, `src/lib/work-data.ts`, `src/app/api/notifications/dispatch/route.ts`.

Production configuration names were inspected without decryption: database, cookie security, Web Push and dispatch credentials exist; no Google OAuth or email delivery configuration exists. Google requires an OAuth client configured by its owner. Branded transactional sending requires a verified sender; no provider/domain is currently available. Do not substitute possession of a shared invitation URL for verification of the invited email. Provider-dependent actions must fail closed and honestly report configuration requirements.

## Migration and rollback gates

1. Rehearse additive/idempotent schema changes locally, verify constraints and account isolation.
2. Before any production migration take a restricted snapshot with counts/checksums; verify restoration and referential integrity.
3. Provision Admin explicitly against the confirmed existing ID, preserve all other users as regular active accounts.
4. Reconcile historical records and monetary totals; never guess ownership of ambiguous records.
5. Deploy only validated increments. Application rollback must remain compatible with additive schema; never restore a snapshot over subsequent user writes without reconciliation.

## Status

Production schema migration and explicit Admin provisioning completed; application deployment pending verification.

- Restricted preflight snapshot: 33 public tables, stored in a private RLS-enabled schema with access revoked from public/client/service roles; an ACL-restricted local copy is excluded from Git.
- Restore rehearsal validated every row checksum and 40 foreign keys. V6 migration applied twice; original columns unchanged except intentionally disabled legacy push subscriptions. Snapshot retained for up to 30 days; reconcile later production writes before rollback. Do not publish the snapshot.
- 55 unit tests passed, TypeScript passed, optimized Webpack build passed.
- Browser coverage passed: security; V5 Food Photo; V5 dashboard/events/workouts; V5 work; V6 Admin plus two isolated users and invitation signup; V6 responsive settings/dashboard at 320, 360, 375, 390, 430, 597, 834, 1024, 1194 and 1440px, including 200% text.
- Local integration verified 30-day deletion grace, anonymization/purge, preservation of recent pending deletions, session revocation and suppression of reminders scheduled before device/master reactivation. Run with `node --import tsx tests/integration/v6-maintenance.ts` against localhost only.
- Browser fixtures simulate verified email using a LOCAL-ONLY database helper. They do not claim delivery through an external provider. No production registration bypass exists.
- Initial combined browser run had a trace-file collision caused by a second simultaneous test invocation; rerunning the affected account test alone passed. Subsequent responsive run passed.

Production reconciliation compared original columns of all 33 tables against the immediate pre-migration checksums. Only the intentional legacy push-disable change differed. Both accounts remain; exactly one Admin exists; all historical Work entries have an employer; no unbound subscription remains enabled. Four push-delivery logs had arrived after the earlier backup and were preserved.

## External configuration and operational limits

Google login/linking requires owner-supplied Google OAuth client configuration. Transactional email (verification, invitations and password reset) requires a verified sender/provider; neither is configured. These controls explain the limitation and fail closed. Existing password logins remain available. No paid service was enabled and no email/SMS/WhatsApp message was sent.

Push provider acceptance is distinguished from actual phone receipt. Production legacy subscriptions require explicit reconnection through Settings > Notifications because old records cannot be securely attributed to a session. Real iPhone receipt must be confirmed on the user's device.

## Rollback

Keep the additive schema when reverting the application commit. Do not drop new tables or restore the snapshot over newer records. Re-enable no legacy subscriptions automatically. Restrict rollback access, reconcile post-snapshot changes, and test restored data in a separate database before any recovery. Retain archived vehicles/employments and versioned contracts.
