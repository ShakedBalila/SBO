// One-time, non-destructive repair for the initial Windows development cluster.
// Keeps the original database intact and copies into a new UTF-8 database.
import 'dotenv/config';
import { Client } from 'pg';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const sourceUrl = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1'].includes(sourceUrl.hostname)) throw new Error('Local databases only');
const targetUrl = new URL(sourceUrl);
targetUrl.pathname = '/sbo_utf8';
const source = new Client({ connectionString: sourceUrl.toString() });
await source.connect();
if ((await source.query('SHOW server_encoding')).rows[0].server_encoding === 'UTF8') {
  console.log('Already UTF-8; no changes.'); await source.end(); process.exit(0);
}
if ((await source.query('SELECT 1 FROM pg_database WHERE datname = $1', ['sbo_utf8'])).rowCount) throw new Error('Target already exists; refusing to overwrite.');
await source.query(`CREATE DATABASE sbo_utf8 WITH TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C'`);
execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env: { ...process.env, DATABASE_URL: targetUrl.toString() }, stdio: 'pipe' });
const target = new Client({ connectionString: targetUrl.toString() });
await target.connect();
const tables = ['User', 'UserSettings', 'Session', 'Task', 'TaskEvent', 'LoginAttempt'];
try {
  await source.query('BEGIN');
  await source.query(`LOCK TABLE ${tables.map(t => `"${t}"`).join(',')} IN SHARE MODE`);
  await target.query('BEGIN');
  for (const table of tables) {
    const rows = await source.query(`SELECT * FROM "${table}"`);
    for (const row of rows.rows) {
      const columns = Object.keys(row);
      const values = columns.map(key => key === 'snapshot' ? JSON.stringify(row[key]) : row[key]);
      await target.query(`INSERT INTO "${table}" (${columns.map(k => `"${k}"`).join(',')}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(',')})`, values);
    }
    const copied = Number((await target.query(`SELECT count(*) FROM "${table}"`)).rows[0].count);
    if (copied !== rows.rowCount) throw new Error(`Copy verification failed: ${table}`);
  }
  await target.query('COMMIT');
  const env = readFileSync('.env', 'utf8').replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${targetUrl.toString()}`);
  writeFileSync('.env', env);
  await source.query('COMMIT');
  console.log('Verified all records copied to UTF-8; .env updated. Original database preserved.');
} catch (error) {
  await target.query('ROLLBACK'); await source.query('ROLLBACK'); throw error;
} finally { await source.end(); await target.end(); }
