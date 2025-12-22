import "dotenv/config";
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkSchema() {
  // Check Lesson table columns
  const result = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'Lesson'
    ORDER BY ordinal_position
  `);

  console.log("Lesson table columns:");
  console.log(result.rows);

  await pool.end();
}

checkSchema();
