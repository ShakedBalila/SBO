import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';

const url=process.env.DIRECT_URL??process.env.DATABASE_URL;
if(!url)throw new Error('DATABASE_URL is required for schema deployment.');
const migrations=[
  '../prisma/migrations/20260927195800_nutrition_food_catalog/migration.sql',
  '../prisma/migrations/20260927233000_nutrition_servings_supplements/migration.sql'
];
const pool=new Pool({connectionString:url,connectionTimeoutMillis:15000,max:1});
try{
  for(const migration of migrations)await pool.query(await readFile(new URL(migration,import.meta.url),'utf8'));
  console.log('Nutrition schema is ready.');
}finally{
  await pool.end();
}
