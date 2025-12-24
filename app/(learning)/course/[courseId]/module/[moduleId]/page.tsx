import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ModuleContent } from "./ModuleContent";

interface ModulePageProps {
  params: Promise<{ courseId: string; moduleId: string }>;
}

async function getModuleData(courseId: string, moduleId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      description: true,
      learningObjectives: true,
    },
  });

  if (!course) {
    return null;
  }

  const module = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      lessons: {
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          title: true,
          orderIndex: true,
          kpointVideoId: true,
          description: true,
        },
      },
    },
  });

  if (!module || module.courseId !== courseId) {
    return null;
  }

  return { course, module };
}

export default async function ModulePage({ params }: ModulePageProps) {
  const { courseId, moduleId } = await params;
  const data = await getModuleData(courseId, moduleId);

  if (!data) {
    notFound();
  }

  const { course, module } = data;

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
      />
    </Suspense>
  );
}
