"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { AvailableCourse, ModuleWithLessons } from "@/types/course";

/**
 * Get all published courses that the user is NOT enrolled in
 */
export async function getAvailableCourses(): Promise<AvailableCourse[]> {
  const session = await auth();

  if (!session?.user?.id) {
    return [];
  }

  try {
    const courses = await prisma.course.findMany({
      where: {
        isPublished: true,
        enrollments: {
          none: {
            userId: session.user.id,
          },
        },
      },
      select: {
        id: true,
        course_id: true,
        title: true,
        slug: true,
        description: true,
        thumbnail: true,
        difficulty: true,
        estimatedDuration: true,
        _count: {
          select: {
            lessons: {
              where: {
                isPublished: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return courses;
  } catch (error) {
    console.error("Error fetching available courses:", error);
    return [];
  }
}

/**
 * Enroll the current user in a course
 * @param courseId The ID of the course to enroll in
 * @returns Success status and message
 */
export async function enrollInCourse(courseId: string): Promise<{
  success: boolean;
  message: string;
}> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      message: "You must be logged in to enroll in a course",
    };
  }

  try {
    // Check if course exists and is published
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, isPublished: true, title: true },
    });

    if (!course) {
      return {
        success: false,
        message: "Course not found",
      };
    }

    if (!course.isPublished) {
      return {
        success: false,
        message: "This course is not available for enrollment",
      };
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: courseId,
        },
      },
    });

    if (existingEnrollment) {
      return {
        success: false,
        message: "You are already enrolled in this course",
      };
    }

    // Create enrollment
    await prisma.enrollment.create({
      data: {
        userId: session.user.id,
        courseId: courseId,
        status: "active",
      },
    });

    // Revalidate the learning layout to refresh the sidebar
    revalidatePath("/(learning)", "layout");

    return {
      success: true,
      message: `Successfully enrolled in ${course.title}`,
    };
  } catch (error) {
    console.error("Error enrolling in course:", error);
    return {
      success: false,
      message: "Failed to enroll in course. Please try again.",
    };
  }
}

/**
 * Unenroll the current user from a course
 * @param courseId The ID of the course to unenroll from
 * @returns Success status and message
 */
export async function unenrollFromCourse(courseId: string): Promise<{
  success: boolean;
  message: string;
}> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      message: "You must be logged in",
    };
  }

  try {
    // Delete enrollment
    await prisma.enrollment.delete({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: courseId,
        },
      },
    });

    // Revalidate the learning layout
    revalidatePath("/(learning)", "layout");

    return {
      success: true,
      message: "Successfully unenrolled from course",
    };
  } catch (error) {
    console.error("Error unenrolling from course:", error);
    return {
      success: false,
      message: "Failed to unenroll. Please try again.",
    };
  }
}

/**
 * Get course modules with lessons and progress for the current user
 * @param courseId The ID of the course
 * @returns Modules with lessons and progress data
 */
export async function getCourseModules(
  courseId: string
): Promise<ModuleWithLessons[]> {
  const session = await auth();

  if (!session?.user?.id) {
    return [];
  }

  try {
    const modules = await prisma.module.findMany({
      where: {
        courseId,
        isPublished: true,
      },
      include: {
        lessons: {
          where: {
            isPublished: true,
          },
          include: {
            progress: {
              where: {
                userId: session.user.id,
              },
            },
          },
          orderBy: {
            orderIndex: "asc",
          },
        },
      },
      orderBy: {
        orderIndex: "asc",
      },
    });

    // Transform to match our types
    return modules.map((module) => ({
      ...module,
      lessons: module.lessons.map((lesson) => ({
        ...lesson,
        progress: lesson.progress[0] || null,
      })),
    }));
  } catch (error) {
    console.error("Error fetching course modules:", error);
    return [];
  }
}
