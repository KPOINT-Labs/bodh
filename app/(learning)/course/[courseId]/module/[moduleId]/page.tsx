import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { ModuleContent } from "./ModuleContent";
import { mockTourData } from "@/lib/mockTourData";
import { ensureEnrollment } from "@/actions/enrollment";

// Render at request time (database required)
export const dynamic = "force-dynamic";

interface ModulePageProps {
  params: Promise<{ courseId: string; moduleId: string }>;
  searchParams: Promise<{ lesson?: string; tour?: string; panel?: string }>;
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
          duration: true,
          quiz: true,
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
  const resolvedSearchParams = await searchParams;
  const { lesson: initialLessonId, panel } = resolvedSearchParams;
  // Panel opens if ?panel=true OR if ?lesson=xxx is specified
  const initialPanelOpen = panel === "true" || !!initialLessonId;

  // Get authenticated user
  const session = await auth();
  if (!session?.user?.id) {
    notFound();
  }

  // Detect tour mode: both route params AND query parameter must match
  const tourParam = resolvedSearchParams.tour;
  const isTourMode = courseId === "demo" && moduleId === "demo" && tourParam === "true";

  // If tour mode, use mock data instead of database
  if (isTourMode) {
    return (
      <ModuleContent
        course={mockTourData.course}
        module={mockTourData.module}
        userId={session.user.id}
        initialLessonId={mockTourData.module.lessons[0]?.id}
        isTourMode={true}
      />
    );
  }

  // Normal mode: query database
  const data = await getModuleData(courseId, moduleId);
  if (!data) {
    notFound();
  }

  const { course, module } = data;

  // Auto-enroll user if not already enrolled
  await ensureEnrollment(session.user.id, course.id);

  return (
    <ModuleContent
      course={course}
      module={module}
      userId={session.user.id}
      initialLessonId={initialLessonId}
      initialPanelOpen={initialPanelOpen}
      isTourMode={false}
    />
  );
}
