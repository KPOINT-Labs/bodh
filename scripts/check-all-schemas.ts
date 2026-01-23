import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkSchema() {
  const tables = ["Course", "Module", "Lesson"];

  for (const table of tables) {
    const result = await pool.query(
      `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `,
      [table]
    );

    console.log(`\n=== ${table} table columns ===`);
    result.rows.forEach((row) => {
      console.log(
        `  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`
      );
    });
  }

  await pool.end();
}

checkSchema();
