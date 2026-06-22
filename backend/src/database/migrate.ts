import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { pool } from './pool';

export const runMigrations = async (): Promise<void> => {
  // Tracking table — idempotent
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id          SERIAL      PRIMARY KEY,
      filename    VARCHAR(255) UNIQUE NOT NULL,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const dir = path.join(__dirname, 'migrations');
  const files = (await readdir(dir))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const already = await pool.query(
      'SELECT 1 FROM _migrations WHERE filename = $1',
      [file],
    );
    if ((already.rowCount ?? 0) > 0) continue;

    const sql = await readFile(path.join(dir, file), 'utf-8');
    await pool.query(sql);
    await pool.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
    console.log(`  ✓ ${file}`);
  }
};

// Allow running directly: tsx src/database/migrate.ts
if (require.main === module) {
  runMigrations()
    .then(() => { console.log('Migrations complete.'); process.exit(0); })
    .catch((err) => { console.error(err); process.exit(1); });
}
