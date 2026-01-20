import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId is required" },
        { status: 400 }
      );
    }

    // Fetch user's enrollments with full course data, sorted by course title
    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId,
        status: "active",
      },
      orderBy: {
        course: {
          title: "asc",
        },
      },
      include: {
        course: {
          include: {
            modules: {
              orderBy: { orderIndex: "asc" },
              include: {
                lessons: {
                  orderBy: { orderIndex: "asc" },
                  select: {
                    id: true,
                    title: true,
                    orderIndex: true,
                    type: true,
                    duration: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Fetch lesson progress for all lessons the user has interacted with
    const lessonProgress = await prisma.lessonProgress.findMany({
      where: { userId },
      select: {
        lessonId: true,
        status: true,
        completionPercentage: true,
      },
    });

    // Create a map for quick lookup
    const progressMap = new Map(
      lessonProgress.map((p) => [p.lessonId, p])
    );

    // Transform data into the format expected by PeerLearningPanel
    const courses = enrollments.map((enrollment) => {
      const course = enrollment.course;

      // Calculate module and lesson statuses
      const modules = course.modules.map((module) => {
        const lessons = module.lessons.map((lesson) => {
          const progress = progressMap.get(lesson.id);
          let status: "completed" | "seen" | "attempted" | "in_progress" | "not_started" = "not_started";

          if (progress) {
            // Map database status to UI status
            switch (progress.status) {
              case "completed":
                status = "completed";
                break;
              case "in_progress":
                status = "in_progress";
                break;
              case "seen":
                status = "seen";
                break;
              case "attempted":
                status = "attempted";
                break;
              default:
                status = "not_started";
            }
          }

          return {
            id: lesson.id,
            title: lesson.title,
            type: lesson.type,
            status,
          };
        });

        // Determine module status based on lesson statuses
        const completedCount = lessons.filter((l) => l.status === "completed").length;
        const inProgressCount = lessons.filter(
          (l) => l.status === "in_progress" || l.status === "seen" || l.status === "attempted"
        ).length;

        let moduleStatus: "completed" | "in_progress" | "yet_to_start" = "yet_to_start";
        if (completedCount === lessons.length && lessons.length > 0) {
          moduleStatus = "completed";
        } else if (completedCount > 0 || inProgressCount > 0) {
          moduleStatus = "in_progress";
        }

        return {
          id: module.id,
          title: module.title,
          status: moduleStatus,
          lessonCount: lessons.length,
          lessons,
        };
      });

      // Calculate overall course progress
      const totalLessons = modules.reduce((sum, m) => sum + m.lessonCount, 0);
      const completedLessons = modules.reduce(
        (sum, m) => sum + m.lessons.filter((l) => l.status === "completed").length,
        0
      );
      const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      // Calculate total duration in minutes (duration is stored in seconds)
      const totalDurationSeconds = course.modules.reduce(
        (sum, m) => sum + m.lessons.reduce((lessonSum, l) => lessonSum + (l.duration || 0), 0),
        0
      );
      const totalDuration = Math.round(totalDurationSeconds / 60);

      // Determine course status based on progress and lesson activity
      let courseStatus: "completed" | "in_progress" | "yet_to_start" = "yet_to_start";
      if (progress === 100) {
        courseStatus = "completed";
      } else if (progress > 0) {
        // At least one lesson completed
        courseStatus = "in_progress";
      } else {
        // Check if any lesson has been started (in_progress, seen, or attempted)
        const hasStartedLessons = modules.some((m) =>
          m.lessons.some((l) =>
            l.status === "in_progress" || l.status === "seen" || l.status === "attempted"
          )
        );
        if (hasStartedLessons) {
          courseStatus = "in_progress";
        }
      }

      return {
        id: course.id,
        title: course.title,
        slug: course.slug,
        course_id: course.course_id,
        progress,
        status: courseStatus,
        totalDuration,
        modules,
      };
    });

    return NextResponse.json({
      success: true,
      courses,
    });
  } catch (error) {
    console.error("Failed to fetch enrolled courses:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch courses" },
      { status: 500 }
    );
  }
}
