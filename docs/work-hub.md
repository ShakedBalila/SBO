# Work hub

`/work` is available in the existing sidebar and mobile navigation. It uses
the existing accounts, Prisma/Postgres connection and deployment pipeline.
No paid integration or additional storage product is provisioned.

## Contract and calculations

New accounts start with salary, allowances, vacation and contribution rates
unconfigured (zero). The one-time October 11 migration preserves saved
contracts and materializes the previous personal defaults only for existing
accounts without a saved contract. Subsequent deployments never assign those
personal defaults to new accounts. Employment start/end dates, workdays and
opening vacation balance are editable. The hourly divisor defaults to 182 monthly hours; overtime
tier defaults are 120 minutes at 125%, then 150%, all explicitly editable.
These are personal estimation parameters, not a determination of legal
entitlements. Sick pay adjustments use the configured daily hours/hourly
divisor; gross estimation is before tax and deductions. Cibus is displayed
as a separate benefit, not added to gross pay.

Salary estimates require a start date and configured salary. Months before
employment have no salary or deficit. Partial months default to proration
by contract workdays, including travel allowance and the social base; calendar
days and an unprorated travel allowance are editable alternatives. Only past
days with completed logs can establish a hours deficit; missing logs have a
separate count. Vacation accrues monthly at annual entitlement / 12, prorating
partial calendar months and stopping at employment end. Annual upfront
entitlement is an editable alternative. Historical logs remain visible.

Only personally approved overtime contributes to estimated pay. Multiple
shifts share the daily regular-hour limit and tier thresholds. Actual break
time is excluded; the live clock tracks explicit pauses and persists across
reloads and devices. Manual shifts can span midnight (maximum 48 hours)
and are assigned to their entry date. Local wall-clock inputs use the account
timezone including DST. Sick/vacation days suppress deficit warnings.

Trips, per diem, documents, expense records and travel entries share a trip
ID. Travel entries and foreign expenses automatically join the single trip
covering their date when no explicit selection was made. Overlapping trips
require explicit selection. A planned trip appears in the calendar without
inventing worked hours. Per diem remains a planned amount configured per
trip/day; it does not create a fictitious paid expense. Selected trips show
expenses across their entire date range, regardless of the month selector.
Departure and return eligibility each default to one day and are editable
from zero to one. A same-day trip uses the lesser fraction once. Summaries
separate reimbursable personal expenses, company-card expenses and total
trip costs including planned per diem. Currency conversion can be corrected
manually; an unavailable per-diem rate is displayed as incomplete.

Historical exchange rates use [Frankfurter](https://frankfurter.dev/), a free
public API without an API key. Rates are saved with the expense and their
actual date; a manually entered rate takes precedence. Service failures
allow a manual rate, rather than silently using an incorrect default.

## Documents and exports

PDF/JPEG/PNG/WebP documents (maximum 10 MB each) are stored privately in
the existing database, with type checks from file bytes and authenticated
view/download endpoints. A phone camera receipt input is available.
The UI transfers files in 1 MB chunks to stay within hosting request/response
limits. Incomplete uploads are hidden and cleaned up. Larger phone images
are compressed in the browser when possible; PDFs are preserved. Document
dates, payslip month/year and optional trip links are saved as metadata.
New tables deny anonymous/Supabase client-role access through RLS and
revoked grants; the existing server-side session model remains authoritative.

Excel export creates an actual `.xlsx` workbook with Hebrew and RTL view.
PDF export opens a dedicated report and uses the browser's Print/Save as PDF
dialog, keeping Hebrew text and requiring no paid conversion service.
Global JSON/CSV exports include work records and document metadata. Binary
documents are downloaded separately from the Work Documents screen.
The global screen is named Export and Backup and explicitly describes that
it does not implement automatic JSON restoration.

Vacation requests and approval tags are personal records: nothing is sent
to an employer. The module performs no banking/payroll payment operations.

## Verification

Unit tests cover breaks, approved overtime tiers, multiple shifts, meal
eligibility, social contribution base and Jerusalem DST conversion.
Browser tests exercise saved contract edits, live clock actions, leave,
trip expenses, private documents, cross-account denial, actual XLSX output,
print rendering and responsive bounds at 320/390/507/834/1440 px.
Review tests also cover neutral registration, reload-persistent skippable
setup, employment boundaries, Trip A with partial refills, browser uploads,
10 MB byte-perfect transfers, reminder/device distinction and 375/430 px.
