import fs from 'fs';
import path from 'path';
import { pool } from './connection';

export async function runMigrations() {
  console.log('Running database migrations...');
  const client = await pool.connect();
  try {
    let migrationPath = path.resolve(__dirname, '../../../database/migrations/001_initial_schema.sql');
    if (!fs.existsSync(migrationPath)) {
      migrationPath = path.resolve(process.cwd(), 'database/migrations/001_initial_schema.sql');
    }
    if (!fs.existsSync(migrationPath)) {
      migrationPath = path.resolve(process.cwd(), '../database/migrations/001_initial_schema.sql');
    }
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found at ${migrationPath}`);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migrations executed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
