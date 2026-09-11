import 'dotenv/config';
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import path from 'node:path';
const url = new URL(process.env.DATABASE_URL ?? 'postgresql://sbo:sbo_local_change_me@localhost:5432/sbo');
if (!['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('db:local requires a localhost DATABASE_URL.');
const databaseDir = path.resolve('.local/postgres');
const pg = new EmbeddedPostgres({
  databaseDir, user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
  port: Number(url.port || 5432), persistent: true, authMethod: 'scram-sha-256',
  postgresFlags: ['-h', '127.0.0.1'], onLog: () => {}, onError: console.error,
  initdbFlags: ['--encoding=UTF8']
});
if (!existsSync(path.join(databaseDir, 'PG_VERSION'))) await pg.initialise();
await pg.start();
const client = pg.getPgClient('postgres', '127.0.0.1');
await client.connect();
const name = url.pathname.slice(1);
if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) throw new Error('Use a simple alphanumeric database name.');
if (!(await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name])).rowCount) {
  await client.query(`CREATE DATABASE "${name}" WITH TEMPLATE template0 ENCODING 'UTF8'`);
}
await client.end();
console.log(`Local PostgreSQL is ready on 127.0.0.1:${url.port || 5432}. Data: ${databaseDir}`);
console.log('Keep this terminal open. Ctrl+C stops the server and preserves your data.');
setInterval(() => {}, 60000);
