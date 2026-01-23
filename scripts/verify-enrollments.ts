import { prisma } from "@/lib/prisma";

async function verifyEnrollments() {
  console.log("\n🔍 Verifying enrollment status...\n");

  // Get total user count
  const totalUsers = await prisma.user.count();
  console.log(`Total users: ${totalUsers}`);

  // Get users with enrollments
  const usersWithEnrollments = await prisma.user.count({
    where: {
      enrollments: { some: {} },
    },
  });
  console.log(`Users with enrollments: ${usersWithEnrollments}`);

  // Get users without enrollments
  const usersWithoutEnrollments = await prisma.user.count({
    where: {
      enrollments: { none: {} },
    },
  });
  console.log(`Users without enrollments: ${usersWithoutEnrollments}`);

  // Get total enrollment count
  const totalEnrollments = await prisma.enrollment.count();
  console.log(`Total enrollments: ${totalEnrollments}`);

  // Get published course count
  const publishedCourses = await prisma.course.count({
    where: { isPublished: true },
  });
  console.log(`Published courses: ${publishedCourses}`);

  console.log("\n✅ Verification complete!");

  if (usersWithoutEnrollments > 0) {
    console.log(
      `\n⚠️  Warning: ${usersWithoutEnrollments} users still have no enrollments`
    );
  } else {
    console.log("\n✨ All users have enrollments!");
  }
}

verifyEnrollments()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
