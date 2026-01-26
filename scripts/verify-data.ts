import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function verify() {
  // Get course
  const course = await pool.query(
    `SELECT * FROM "Course" WHERE id = 'BSCCS1001'`
  );
  console.log("\n=== COURSE ===");
  console.log(course.rows[0]);

  // Get modules with lesson count
  const modules = await pool.query(`
    SELECT m.id, m.title, m."orderIndex", COUNT(l.id) as lesson_count
    FROM "Module" m
    LEFT JOIN "Lesson" l ON l."moduleId" = m.id
    WHERE m."courseId" = 'BSCCS1001'
    GROUP BY m.id, m.title, m."orderIndex"
    ORDER BY m."orderIndex"
  `);
  console.log("\n=== MODULES ===");
  console.log(modules.rows);

  // Get all lessons in order
  const lessons = await pool.query(`
    SELECT l.id, l.title, l.type, l."orderIndex", m.title as module_title
    FROM "Lesson" l
    JOIN "Module" m ON l."moduleId" = m.id
    WHERE l."courseId" = 'BSCCS1001'
    ORDER BY m."orderIndex", l."orderIndex"
  `);
  console.log("\n=== LESSONS (in sequence) ===");
  lessons.rows.forEach((lesson, idx) => {
    console.log(
      `${idx + 1}. [${lesson.module_title}] ${lesson.title} (${lesson.type})`
    );
  });

  await pool.end();
}

verify();
