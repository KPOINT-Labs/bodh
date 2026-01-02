import { Pool } from 'pg';
import 'dotenv/config';

console.log("Testing database connection...");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Set" : "Not set");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query('SELECT 1 as test')
  .then((result) => {
    console.log('Connected successfully!', result.rows);
  })
  .catch((e) => {
    console.error('Connection error:', e.message);
  })
  .finally(() => {
    pool.end();
  });
