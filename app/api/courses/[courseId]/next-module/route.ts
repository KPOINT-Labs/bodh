import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ courseId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { courseId } = await params;
    const { searchParams } = new URL(request.url);
    const currentModuleId = searchParams.get("currentModuleId");

    if (!currentModuleId) {
      return NextResponse.json(
        { success: false, error: "currentModuleId is required" },
        { status: 400 }
      );
    }

    // Find course by course_id, id, or slug
    let course = await prisma.course.findUnique({
      where: { course_id: courseId },
      select: { id: true },
    });

    if (!course) {
      course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true },
      });
    }

    if (!course) {
      course = await prisma.course.findUnique({
        where: { slug: courseId },
        select: { id: true },
      });
    }

    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 }
      );
    }

    // Get all modules for this course ordered by orderIndex
    const modules = await prisma.module.findMany({
      where: { courseId: course.id },
      orderBy: { orderIndex: "asc" },
      select: {
        id: true,
        title: true,
        orderIndex: true,
        lessons: {
          orderBy: { orderIndex: "asc" },
          take: 1, // Only get the first lesson
          select: {
            id: true,
            title: true,
            kpointVideoId: true,
          },
        },
      },
    });

    // Find current module index
    const currentIndex = modules.findIndex((m) => m.id === currentModuleId);

    if (currentIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Current module not found in course" },
        { status: 404 }
      );
    }

    // Check if there's a next module
    if (currentIndex >= modules.length - 1) {
      return NextResponse.json({
        success: true,
        hasNextModule: false,
        nextModule: null,
        message: "This is the last module in the course",
      });
    }

    const nextModule = modules[currentIndex + 1];
    const firstLesson = nextModule.lessons[0] || null;

    return NextResponse.json({
      success: true,
      hasNextModule: true,
      nextModule: {
        id: nextModule.id,
        title: nextModule.title,
        orderIndex: nextModule.orderIndex,
        firstLesson: firstLesson,
      },
    });
  } catch (error) {
    console.error("Failed to get next module:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get next module" },
      { status: 500 }
    );
  }
}
