import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';

const url=process.env.DIRECT_URL??process.env.DATABASE_URL;
if(!url)throw new Error('DATABASE_URL is required for schema deployment.');
const sql=await readFile(new URL('../prisma/migrations/20260927195800_nutrition_food_catalog/migration.sql',import.meta.url),'utf8');
const pool=new Pool({connectionString:url,connectionTimeoutMillis:15000,max:1});
try{
  await pool.query(sql);
  console.log('Nutrition schema is ready.');
}finally{
  await pool.end();
}
