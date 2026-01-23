import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seedCourse() {
  console.log("Starting to seed course data...");

  const courseId = "BSCCS1001";

  // Create the course using raw SQL with ON CONFLICT
  await pool.query(
    `
    INSERT INTO "Course" (id, title, description, "isPublished", "createdAt", "updatedAt")
    VALUES ($1, $2, NULL, true, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      "isPublished" = EXCLUDED."isPublished",
      "updatedAt" = NOW()
  `,
    [courseId, "Computational Thinking"]
  );
  console.log("Created course:", courseId);

  // Create modules
  const modules = [
    { id: "BSCCS1001-M0", title: "Introduction", orderIndex: 0 },
    { id: "BSCCS1001-M1", title: "Understanding Datasets", orderIndex: 1 },
    { id: "BSCCS1001-M2", title: "Iteration and Filtering", orderIndex: 2 },
    {
      id: "BSCCS1001-M3",
      title: "Flowcharts and Algorithm Representation",
      orderIndex: 3,
    },
  ];

  for (const mod of modules) {
    await pool.query(
      `
      INSERT INTO "Module" (id, "courseId", title, "orderIndex", "isPublished", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, true, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        "orderIndex" = EXCLUDED."orderIndex",
        "isPublished" = EXCLUDED."isPublished",
        "updatedAt" = NOW()
    `,
      [mod.id, courseId, mod.title, mod.orderIndex]
    );
    console.log("Created module:", mod.title);
  }

  // Define all lessons with their module assignments
  const lessons = [
    // Module 0: Introduction
    {
      id: "gcc-91a3a9bf-2ba9-4509-9c5c-af450f79d735",
      moduleId: "BSCCS1001-M0",
      title: "Computational Thinking - Introduction to Course",
      type: "lecture",
      orderIndex: 0,
    },
    // Module 1: Understanding Datasets
    {
      id: "gcc-715771f7-126f-4e60-b84d-76aeb8a3dda8",
      moduleId: "BSCCS1001-M1",
      title: "Lesson 1 - Introduction to Datasets",
      type: "lecture",
      orderIndex: 0,
    },
    // Module 2: Iteration and Filtering
    {
      id: "gcc-9939250b-539d-4c04-92ab-b42cfa434d7c",
      moduleId: "BSCCS1001-M2",
      title: "Lesson 2 - Concept of variables iterators and filtering",
      type: "lecture",
      orderIndex: 0,
    },
    {
      id: "gcc-9d22c507-ccc4-4d0f-acc6-c1799d387f2a",
      moduleId: "BSCCS1001-M2",
      title: "Tutorial for Lesson 2",
      type: "tutorial",
      orderIndex: 1,
    },
    {
      id: "gcc-e560fef8-1ed6-449c-b97c-7cacf1a0269b",
      moduleId: "BSCCS1001-M2",
      title: "Lesson 3 - Iterations using combination of filtering conditions",
      type: "lecture",
      orderIndex: 2,
    },
    {
      id: "gcc-922aa16d-6c2e-47a2-9936-545c061f4801",
      moduleId: "BSCCS1001-M2",
      title: "Tutorial for Lesson 3",
      type: "tutorial",
      orderIndex: 3,
    },
    // Module 3: Flowcharts and Algorithm Representation
    {
      id: "gcc-73576872-8f3c-49cb-a834-49afb5458fbc",
      moduleId: "BSCCS1001-M3",
      title: "Lesson 4 - Introduction to flowcharts",
      type: "lecture",
      orderIndex: 0,
    },
    {
      id: "gcc-a97b47c1-c2b9-4264-a33c-9e4365571f9c",
      moduleId: "BSCCS1001-M3",
      title: "Lesson 5 - Flowchart for Sum with Filtering",
      type: "lecture",
      orderIndex: 1,
    },
    {
      id: "gcc-0050f775-a288-4645-ad09-184dc5b2e6d1",
      moduleId: "BSCCS1001-M3",
      title: "Tutorial for Lesson 5",
      type: "tutorial",
      orderIndex: 2,
    },
  ];

  // Insert all lessons
  for (const lesson of lessons) {
    await pool.query(
      `
      INSERT INTO "Lesson" (id, "moduleId", "courseId", title, type, "orderIndex", "isPublished", duration, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, true, 0, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        "moduleId" = EXCLUDED."moduleId",
        title = EXCLUDED.title,
        type = EXCLUDED.type,
        "orderIndex" = EXCLUDED."orderIndex",
        "isPublished" = EXCLUDED."isPublished",
        "updatedAt" = NOW()
    `,
      [
        lesson.id,
        lesson.moduleId,
        courseId,
        lesson.title,
        lesson.type,
        lesson.orderIndex,
      ]
    );
    console.log("  Created lesson:", lesson.title);
  }

  console.log("\nSeeding completed successfully!");
  console.log("\nSummary:");
  console.log("- Course: BSCCS1001 - Computational Thinking");
  console.log("- Module 0: Introduction (1 lesson)");
  console.log("- Module 1: Understanding Datasets (1 lesson)");
  console.log("- Module 2: Iteration and Filtering (4 lessons)");
  console.log(
    "- Module 3: Flowcharts and Algorithm Representation (3 lessons)"
  );
}

seedCourse()
  .catch((e) => {
    console.error("Error seeding data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
