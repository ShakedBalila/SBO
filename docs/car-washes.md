# One-time vehicle washes

Washes reuse the existing private VehicleExpense ledger with type CarWash;
washType, location and updatedAt are additive fields. No recurring setting,
next-service date or fuel data is created by the car-wash endpoint.

The compact expense summary has a month selector, a wash count/cost tile,
quick Add Wash and expandable history. Dates default to the account's today.
Wash dates determine the expense month; edit/delete refreshes the summary,
history and chart from saved data. Notes/location are expandable.

Vehicle costs include fuel, washes, maintenance/test, parking/tolls, other
expenses and the existing monthly insurance allocation. All account vehicles
are included. Calculations round individual financial amounts to cents and
use complete loaded data; a latest-record cap only affects the fuel/maintenance
history presentation, not the financial calculation.

Cost per recorded kilometer uses valid full-to-full distances only when both
boundaries are inside the selected month. Cross-month intervals do not invent
monthly distance. The UI identifies this as cost per recorded kilometer,
not a complete odometer-based monthly mileage estimate.

POST/PATCH/DELETE /api/modules/car-washes validates a positive amount, a
real date, optional wash type, location and notes. Every operation is scoped
to the signed-in owner; the selected vehicle must belong to that owner.
PATCH/DELETE also require type CarWash, preventing accidental modification
of unrelated maintenance records through the wash endpoint. Unknown fields,
including recurrence and userId, are rejected.

JSON exports include wash metadata with vehicle expenses. CSV exports add
wash and other vehicle expense rows. Existing data and account settings are
preserved; the database migration is additive and idempotent.
The expense table denies direct Supabase client-role access through RLS and
revoked client grants, following the existing WorkExpense server-access model.

Verification covers the example 60 + 75 = 135; 820 fuel + 135 washes + 90
parking = 1045; date moves, deletion, no future repetition, currency rounding,
unchanged fuel economy, cross-account denial and responsive forms.
