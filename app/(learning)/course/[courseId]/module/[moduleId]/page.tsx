import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ModuleContent } from "./ModuleContent";

// Render at request time (database required)
export const dynamic = "force-dynamic";

interface ModulePageProps {
  params: Promise<{ courseId: string; moduleId: string }>;
  searchParams: Promise<{ lesson?: string }>;
}

async function getModuleData(courseIdOrSlug: string, moduleId: string) {
  // Try to find course by course_id first (e.g. "BSCCS1001"), then ID, then slug
  let course = await prisma.course.findUnique({
    where: { course_id: courseIdOrSlug },
    select: {
      id: true,
      title: true,
      description: true,
      learningObjectives: true,
    },
  });

  // If not found by course_id, try by CUID id
  if (!course) {
    course = await prisma.course.findUnique({
      where: { id: courseIdOrSlug },
      select: {
        id: true,
        title: true,
        description: true,
        learningObjectives: true,
      },
    });
  }

  // If not found by ID, try by slug
  if (!course) {
    course = await prisma.course.findUnique({
      where: { slug: courseIdOrSlug },
      select: {
        id: true,
        title: true,
        description: true,
        learningObjectives: true,
      },
    });
  }

  if (!course) {
    return null;
  }

  const foundModule = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      lessons: {
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          title: true,
          orderIndex: true,
          kpointVideoId: true,
          youtubeVideoId: true,
          description: true,
        },
      },
    },
  });

  // Compare with course.id (not the slug parameter)
  if (!foundModule || foundModule.courseId !== course.id) {
    return null;
  }

  // TODO: Replace with actual authenticated user when auth is implemented
  // For now, use the sample user (created via scripts/create-sample-user.ts)
  const user = await prisma.user.findFirst({
    where: { email: "learner@bodh.app" },
  });

  if (!user) {
    throw new Error(
      "Sample user not found. Run: bun run scripts/create-sample-user.ts"
    );
  }

  return { course, module: foundModule, userId: user.id };
}

export default async function ModulePage({ params, searchParams }: ModulePageProps) {
  const { courseId, moduleId } = await params;
  const { lesson: initialLessonId } = await searchParams;
  const data = await getModuleData(courseId, moduleId);

  if (!data) {
    notFound();
  }

  const { course, module, userId } = data;

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-sm text-muted-foreground">Loading module...</p>
          </div>
        </div>
      }
    >
      <ModuleContent
        course={course}
        module={module}
        userId={userId}
        initialLessonId={initialLessonId}
      />
    </Suspense>
  );
}
