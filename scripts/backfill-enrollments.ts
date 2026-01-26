import { prisma } from "@/lib/prisma";

async function backfillEnrollments() {
  const dryRun = process.argv.includes("--dry-run");

  console.log("\n🔍 Finding users without enrollments...");

  // Find users with no enrollments
  const usersWithoutEnrollments = await prisma.user.findMany({
    where: {
      enrollments: { none: {} },
    },
    select: { id: true, email: true, name: true },
  });

  console.log(
    `Found ${usersWithoutEnrollments.length} users without enrollments\n`
  );

  // Get all published courses
  const publishedCourses = await prisma.course.findMany({
    where: { isPublished: true },
    select: { id: true, title: true },
  });

  console.log(`Found ${publishedCourses.length} published courses\n`);

  if (publishedCourses.length === 0) {
    console.log("⚠️  No published courses to enroll users in. Exiting.");
    return;
  }

  let totalEnrollments = 0;

  // For each user, create enrollments
  for (const user of usersWithoutEnrollments) {
    const enrollmentData = publishedCourses.map((course) => ({
      userId: user.id,
      courseId: course.id,
      status: "active" as const,
    }));

    if (dryRun) {
      console.log(
        `[DRY RUN] Would enroll ${user.email} in ${publishedCourses.length} courses`
      );
      totalEnrollments += publishedCourses.length;
    } else {
      const result = await prisma.enrollment.createMany({
        data: enrollmentData,
        skipDuplicates: true,
      });

      console.log(`✅ Enrolled ${user.email} in ${result.count} courses`);
      totalEnrollments += result.count;
    }
  }

  console.log("\n📊 Summary:");
  console.log(`   Users processed: ${usersWithoutEnrollments.length}`);
  console.log(
    `   Total enrollments ${dryRun ? "would be" : ""} created: ${totalEnrollments}`
  );

  if (dryRun) {
    console.log("\n💡 Run without --dry-run to apply changes");
  }
}

backfillEnrollments()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
