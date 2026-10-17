import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';

const url=process.env.DIRECT_URL??process.env.DATABASE_URL;
if(!url)throw new Error('DATABASE_URL is required for schema deployment.');
const migrations=[
  '../prisma/migrations/20260927195800_nutrition_food_catalog/migration.sql',
  '../prisma/migrations/20260927233000_nutrition_servings_supplements/migration.sql'
  ,'../prisma/migrations/20260928120000_v3_fuel_details/migration.sql'
  ,'../prisma/migrations/20260929090000_fuel_full_tank_cycles/migration.sql'
  ,'../prisma/migrations/20261005120000_work_hub/migration.sql'
  ,'../prisma/migrations/20261011120000_review_first_use/migration.sql'
  ,'../prisma/migrations/20261012120000_vehicle_washes/migration.sql'
  ,'../prisma/migrations/20261012160000_confirmed_fuel_distance/migration.sql'
  ,'../supabase/migrations/20261013090639_cross_module_refinement.sql'
  ,'../supabase/migrations/20261013143000_desktop_responsive_security.sql'
  ,'../supabase/migrations/20261013144500_audit_owner_access.sql'
  ,'../supabase/migrations/20261013192448_workouts_v4.sql'
  ,'../supabase/migrations/20261015180206_v5_cross_module_photo_work.sql'
  ,'../supabase/migrations/20261016211855_v6_accounts_modules.sql'
];
const pool=new Pool({connectionString:url,connectionTimeoutMillis:15000,max:1});
try{
  for(const migration of migrations)await pool.query(await readFile(new URL(migration,import.meta.url),'utf8'));
  console.log('SBO schema is ready.');
}finally{
  await pool.end();
}
