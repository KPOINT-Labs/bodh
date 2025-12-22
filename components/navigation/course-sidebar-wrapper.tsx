import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CourseWithProgress } from "@/types/course";
import {
  calculateCourseProgress,
  getCourseStatus,
} from "@/lib/course-progress";
import { CourseSidebar } from "./course-sidebar";
import { redirect } from "next/navigation";

/**
 * Server Component wrapper that fetches user courses and passes to client component
 */
export async function CourseSidebarWrapper() {
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch user info
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
    },
  });

  // Fetch enrolled courses with progress
  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId: session.user.id,
      course: {
        isPublished: true,
      },
    },
    include: {
      course: {
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
          },
        },
      },
    },
    orderBy: {
      enrolledAt: "desc",
    },
  });

  // Transform to CourseWithProgress format
  const courses: CourseWithProgress[] = enrollments.map((enrollment) => {
    const totalLessons = enrollment.course.lessons.length;
    const completedLessons = enrollment.course.lessons.filter(
      (lesson) => lesson.progress[0]?.status === "completed"
    ).length;

    const progress = calculateCourseProgress(
      enrollment.course.lessons.map((lesson) => ({
        ...lesson,
        progress: lesson.progress[0] || null,
      }))
    );

    return {
      id: enrollment.course.id,
      course_id: enrollment.course.course_id,
      title: enrollment.course.title,
      slug: enrollment.course.slug,
      description: enrollment.course.description,
      thumbnail: enrollment.course.thumbnail,
      difficulty: enrollment.course.difficulty,
      estimatedDuration: enrollment.course.estimatedDuration,
      progress,
      status: getCourseStatus(progress, completedLessons),
      enrolledAt: enrollment.enrolledAt,
      totalLessons,
      completedLessons,
    };
  });

  return (
    <CourseSidebar
      courses={courses}
      user={{
        name: user?.name || "User",
        email: user?.email || "",
        avatar: user?.avatar || null,
      }}
    />
  );
}
