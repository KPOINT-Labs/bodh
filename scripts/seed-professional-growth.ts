import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const now = new Date().toISOString();

  // Course data
  const courseId = "BSCGN3001";
  const courseTitle = "Professional Growth";
  const courseDescription = "This is the professional growth course";

  // Module data (W2 - Week 2)
  const moduleId = "BSCGN3001-W2";
  const moduleTitle = "Week 2";

  // Lessons data sorted by order
  const lessons = [
    { id: "gcc-a5584523-6a5e-486f-a2da-ec2a4eb334fe", title: "Lesson 1", orderIndex: 0 },
    { id: "gcc-074eddd1-80c9-48ba-9cad-e6d843a03733", title: "Lesson 2.1", orderIndex: 1 },
    { id: "gcc-2f3d54a1-5873-4f1b-bbb4-a27dd40e7299", title: "Lesson 2.4", orderIndex: 2 },
    { id: "gcc-26a572d8-7c2b-4589-bfac-595673fd6387", title: "Lesson 2.5", orderIndex: 3 },
    { id: "gcc-2a5f8898-7a4c-461a-b6fd-f8de02ff4ab8", title: "Lesson 3", orderIndex: 4 },
    { id: "gcc-1bcfd46e-b9bb-4aa0-b014-363d27c6bb9b", title: "Lesson 4", orderIndex: 5 },
    { id: "gcc-18d4ab43-7fc5-41e0-995d-4981b2544317", title: "Lesson 5", orderIndex: 6 },
    { id: "gcc-57cd62ff-5879-4233-badc-0b83f5666798", title: "Lesson 6", orderIndex: 7 },
  ];

  try {
    // Insert course
    console.log("Creating course...");
    await pool.query(
      `INSERT INTO "Course" (id, title, description, "isPublished", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET title = $2, description = $3, "isPublished" = $4, "updatedAt" = $6`,
      [courseId, courseTitle, courseDescription, true, now, now]
    );
    console.log(`✓ Course created: ${courseTitle} (${courseId})`);

    // Insert module
    console.log("Creating module...");
    await pool.query(
      `INSERT INTO "Module" (id, "courseId", title, "orderIndex", "isPublished", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET title = $3, "orderIndex" = $4, "isPublished" = $5, "updatedAt" = $7`,
      [moduleId, courseId, moduleTitle, 0, true, now, now]
    );
    console.log(`✓ Module created: ${moduleTitle} (${moduleId})`);

    // Insert lessons
    console.log("Creating lessons...");
    for (const lesson of lessons) {
      await pool.query(
        `INSERT INTO "Lesson" (id, "moduleId", "courseId", title, "orderIndex", "isPublished", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET title = $4, "orderIndex" = $5, "isPublished" = $6, "updatedAt" = $8`,
        [lesson.id, moduleId, courseId, lesson.title, lesson.orderIndex, true, now, now]
      );
      console.log(`  ✓ Lesson created: ${lesson.title} (${lesson.id})`);
    }

    console.log("\n=== SEED COMPLETE ===");
    console.log(`Course: ${courseTitle}`);
    console.log(`Module: ${moduleTitle}`);
    console.log(`Lessons: ${lessons.length}`);
  } catch (error) {
    console.error("Error seeding data:", error);
  } finally {
    await pool.end();
  }
}

seed();
