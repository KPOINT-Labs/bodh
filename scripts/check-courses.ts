import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkCourses() {
  // Check all courses
  const result = await pool.query(`SELECT id, title, "isPublished" FROM "Course"`);
  console.log("\n=== ALL COURSES ===");
  result.rows.forEach((course) => {
    console.log(`- ${course.title} (id: ${course.id}) - Published: ${course.isPublished}`);
  });

  // Check table counts
  console.log("\n=== TABLE COUNTS ===");
  const tables = ["Course", "Module", "Lesson", "Category"];
  for (const table of tables) {
    const count = await pool.query(`SELECT COUNT(*) FROM "${table}"`);
    console.log(`${table}: ${count.rows[0].count} records`);
  }

  await pool.end();
}

checkCourses();
