import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { ModuleContent } from "./ModuleContent";

// Render at request time (database required)
export const dynamic = "force-dynamic";

interface ModulePageProps {
  params: Promise<{ courseId: string; moduleId: string }>;
  searchParams: Promise<{ lesson?: string }>;
}

async function getModuleData(courseIdOrSlug: string, moduleId: string) {
  // Find course by course_id, id, or slug using sequential unique queries
  let course = await prisma.course.findUnique({
    where: { course_id: courseIdOrSlug },
    select: {
      id: true,
      title: true,
      description: true,
      learningObjectives: true,
    },
  });

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

  return { course, module: foundModule };
}

export default async function ModulePage({ params, searchParams }: ModulePageProps) {
  const { courseId, moduleId } = await params;
  const { lesson: initialLessonId } = await searchParams;

  // Get authenticated user
  const session = await auth();
  if (!session?.user?.id) {
    notFound();
  }

  const data = await getModuleData(courseId, moduleId);
  if (!data) {
    notFound();
  }

  const { course, module } = data;

  return (
    <ModuleContent
      course={course}
      module={module}
      userId={session.user.id}
      initialLessonId={initialLessonId}
    />
  );
}
