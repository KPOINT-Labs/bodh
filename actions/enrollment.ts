"use server";

import { prisma } from "@/lib/prisma";

/**
 * Ensures a user is enrolled in a specific course.
 * Uses upsert to create enrollment if missing, no-op if exists.
 * @param userId - The user ID
 * @param courseId - The course ID to enroll in
 */
export async function ensureEnrollment(
  userId: string,
  courseId: string
): Promise<void> {
  try {
    await prisma.enrollment.upsert({
      where: {
        userId_courseId: { userId, courseId },
      },
      create: {
        userId,
        courseId,
        status: "active",
      },
      update: {}, // No update needed if exists
    });
  } catch (error) {
    console.error(
      `[EnsureEnrollment] Failed for user ${userId}, course ${courseId}:`,
      error
    );
    // Don't throw - enrollment failure shouldn't block course access
  }
}

/**
 * Auto-enrolls a new user in all published courses
 * @param userId - The user ID to enroll
 * @returns Promise<void>
 */
export async function autoEnrollNewUser(userId: string): Promise<void> {
  try {
    // Get all published courses
    const publishedCourses = await prisma.course.findMany({
      where: { isPublished: true },
      select: { id: true },
    });

    // If no published courses, nothing to do
    if (publishedCourses.length === 0) {
      console.log(
        `[AutoEnroll] No published courses available for user ${userId}`
      );
      return;
    }

    // Prepare enrollment data
    const enrollmentData = publishedCourses.map((course) => ({
      userId,
      courseId: course.id,
      status: "active" as const,
    }));

    // Bulk create enrollments
    const result = await prisma.enrollment.createMany({
      data: enrollmentData,
      skipDuplicates: true,
    });

    console.log(
      `[AutoEnroll] Enrolled user ${userId} in ${result.count} courses`
    );
  } catch (error) {
    console.error(`[AutoEnroll] Failed for user ${userId}:`, error);
    // Don't throw - enrollment failure shouldn't block user creation
  }
}
