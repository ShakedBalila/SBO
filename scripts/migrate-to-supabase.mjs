import 'dotenv/config';
import { Client } from 'pg';

const sourceUrl = process.env.SOURCE_DATABASE_URL ?? process.env.DATABASE_URL;
const targetUrl = process.env.TARGET_DATABASE_URL ?? process.env.DIRECT_URL;
if (!sourceUrl || !targetUrl) {
  throw new Error('Set SOURCE_DATABASE_URL and TARGET_DATABASE_URL before running this migration.');
}
if (sourceUrl === targetUrl) throw new Error('Source and target databases must be different.');

const source = new Client({ connectionString: sourceUrl });
const target = new Client({ connectionString: targetUrl });
const tables = [
  { name: 'User', key: ['id'] },
  { name: 'UserSettings', key: ['userId'] },
  { name: 'Task', key: ['id'] },
  { name: 'TaskEvent', key: ['id'] },
  { name: 'WaterEntry', key: ['id'] },
  { name: 'Vehicle', key: ['id'] },
  { name: 'FuelEntry', key: ['id'] },
  { name: 'VehiclePolicy', key: ['id'] },
  { name: 'VehicleReminder', key: ['id'] },
  { name: 'NutritionEntry', key: ['id'] },
  { name: 'CalendarEvent', key: ['id'] }
];

await source.connect();
await target.connect();
try {
  await target.query('BEGIN');
  for (const table of tables) {
    const rows = (await source.query(`SELECT * FROM "${table.name}"`)).rows;
    for (const row of rows) {
      const columns = Object.keys(row);
      const quoted = columns.map(column => `"${column}"`).join(', ');
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
      const updates = columns.filter(column => !table.key.includes(column)).map(column => `"${column}" = EXCLUDED."${column}"`).join(', ');
      const conflict = table.key.map(column => `"${column}"`).join(', ');
      await target.query(
        `INSERT INTO "${table.name}" (${quoted}) VALUES (${placeholders}) ON CONFLICT (${conflict}) DO ${updates ? `UPDATE SET ${updates}` : 'NOTHING'}`,
        columns.map(column => row[column])
      );
    }
    console.log(`${table.name}: ${rows.length}`);
  }
  await target.query('COMMIT');
  console.log('SBO data migration completed. Existing login sessions were intentionally not copied.');
} catch (error) {
  await target.query('ROLLBACK');
  throw error;
} finally {
  await Promise.allSettled([source.end(), target.end()]);
}
