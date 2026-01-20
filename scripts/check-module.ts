/**
 * Script to check module and lesson data
 * Usage: bun scripts/check-module.ts [moduleId]
 */

import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const moduleId = process.argv[2];

  if (!moduleId) {
    console.log("Usage: bun scripts/check-module.ts <moduleId>");
    console.log("\n=== ALL MODULES WITH LESSON COUNTS ===\n");

    const result = await pool.query(`
      SELECT
        m.id,
        m.title as module_title,
        m."orderIndex",
        c.id as course_id,
        c.title as course_title,
        COUNT(l.id) as lesson_count
      FROM "Module" m
      JOIN "Course" c ON m."courseId" = c.id
      LEFT JOIN "Lesson" l ON l."moduleId" = m.id
      GROUP BY m.id, m.title, m."orderIndex", c.id, c.title
      ORDER BY c.title, m."orderIndex"
    `);

    let currentCourse = "";
    for (const row of result.rows) {
      if (row.course_title !== currentCourse) {
        currentCourse = row.course_title;
        console.log(`\n[${row.course_id}] ${row.course_title}`);
      }
      console.log(`  ${row.orderIndex}. ${row.module_title} (${row.lesson_count} lessons)`);
      console.log(`     ID: ${row.id}`);
    }

    await pool.end();
    return;
  }

  // Check specific module
  const moduleResult = await pool.query(
    `
    SELECT
      m.id,
      m.title,
      c.id as course_id,
      c.title as course_title
    FROM "Module" m
    JOIN "Course" c ON m."courseId" = c.id
    WHERE m.id = $1
  `,
    [moduleId]
  );

  if (moduleResult.rows.length === 0) {
    console.log(`Module not found: ${moduleId}`);
    await pool.end();
    return;
  }

  const module = moduleResult.rows[0];
  console.log(`\n=== MODULE DETAILS ===`);
  console.log(`Course: ${module.course_title} (${module.course_id})`);
  console.log(`Module: ${module.title}`);
  console.log(`ID: ${module.id}`);

  // Get lessons
  const lessonsResult = await pool.query(
    `
    SELECT
      id,
      title,
      "orderIndex",
      "kpointVideoId",
      "isPublished"
    FROM "Lesson"
    WHERE "moduleId" = $1
    ORDER BY "orderIndex"
  `,
    [moduleId]
  );

  console.log(`\n=== LESSONS (${lessonsResult.rows.length}) ===`);

  if (lessonsResult.rows.length === 0) {
    console.log("⚠️  No lessons in this module!");
  } else {
    for (const l of lessonsResult.rows) {
      const hasVideo = l.kpointVideoId ? "✓" : "✗";
      const published = l.isPublished ? "" : " [UNPUBLISHED]";
      console.log(`  ${l.orderIndex}. ${l.title} [video: ${hasVideo}]${published}`);
      console.log(`     ID: ${l.id}`);
    }
  }

  await pool.end();
}

main().catch(console.error);
