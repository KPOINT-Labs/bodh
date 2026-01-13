/**
 * Script to add dummy lesson progress for a course
 * Run with: npx tsx scripts/add-lesson-progress.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Specific lesson details
  const lessonId = "cmjh1lejc0004k4d2yv5ap34c";
  const kpointVideoId = "gcc-715771f7-126f-4e60-b84d-76aeb8a3dda8";

  // Find the lesson
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
  });

  if (!lesson) {
    console.log(`No lesson found with ID: ${lessonId}`);
    return;
  }

  console.log(`Found lesson: ${lesson.title}`);
  console.log(`Lesson ID: ${lesson.id}`);
  console.log(`KPoint Video ID: ${lesson.kpointVideoId || kpointVideoId}`);

  // Get users
  const users = await prisma.user.findMany({
    take: 5,
    select: { id: true, name: true, email: true },
  });

  console.log("\nAvailable users:");
  users.forEach((u, index) => {
    console.log(`  ${index + 1}. ${u.name || u.email} (ID: ${u.id})`);
  });

  // Use sampleLearner (second user)
  const user = users.find((u) => u.id === "sampleLearner4292") || users[1];

  if (!user) {
    console.log("No users found in the database");
    return;
  }

  console.log(`Using user: ${user.name || user.email} (ID: ${user.id})`);

  // Create or update the lesson progress as IN_PROGRESS
  const lessonProgress = await prisma.lessonProgress.upsert({
    where: {
      userId_lessonId: {
        userId: user.id,
        lessonId: lesson.id,
      },
    },
    update: {
      status: "in_progress",
      completionPercentage: 45, // 45% watched
      watchTime: 120, // 2 minutes watched
      lastPosition: 120,
      completedAt: null,
    },
    create: {
      userId: user.id,
      lessonId: lesson.id,
      status: "in_progress",
      completionPercentage: 45,
      watchTime: 120,
      lastPosition: 120,
    },
  });

  console.log("\nLesson progress created/updated (IN PROGRESS):");
  console.log(lessonProgress);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
