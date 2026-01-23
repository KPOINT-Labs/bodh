import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LessonsForm } from "./_components/lessons-form";
import { ModuleActions } from "./_components/module-actions";
import { ModuleDescriptionForm } from "./_components/module-description-form";
import { ModuleSlugForm } from "./_components/module-slug-form";
import { ModuleTitleForm } from "./_components/module-title-form";

// Render at request time (database required)
export const dynamic = "force-dynamic";

const ModuleIdPage = async ({
  params,
}: {
  params: Promise<{ courseId: string; moduleId: string }>;
}) => {
  const { courseId, moduleId } = await params;

  // Resolve Course (Slug first, then ID)
  let course = await prisma.course.findUnique({
    where: { slug: courseId },
    select: { id: true, slug: true },
  });

  if (!course) {
    course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, slug: true },
    });
  }

  if (!course) {
    return redirect("/");
  }

  // Resolve Module (Slug first, then ID)
  let moduleData = await prisma.module.findFirst({
    where: {
      slug: moduleId,
      courseId: course.id,
    },
    include: {
      lessons: {
        orderBy: {
          orderIndex: "asc",
        },
      },
    },
  });

  if (!moduleData) {
    moduleData = await prisma.module.findFirst({
      where: {
        id: moduleId,
        courseId: course.id,
      },
      include: {
        lessons: {
          orderBy: {
            orderIndex: "asc",
          },
        },
      },
    });
  }

  if (!moduleData) {
    return redirect("/");
  }

  const requiredFields = [
    moduleData.title,
    // moduleData.description, // Optional for publish
    moduleData.lessons.some((lesson) => lesson.isPublished), // At least one published lesson
  ];

  const totalFields = requiredFields.length;
  const completedFields = requiredFields.filter(Boolean).length;

  const completionText = `(${completedFields}/${totalFields})`;

  const isComplete = requiredFields.every(Boolean);

  const courseUrlParam = course.slug || course.id;
  const moduleUrlParam = moduleData.slug || moduleData.id;

  return (
    <div className="p-6">
      {!moduleData.isPublished && (
        <div className="mb-6 rounded-md border border-yellow-200 bg-yellow-100 px-4 py-2 font-medium text-sm text-yellow-800">
          This module is unpublished. It will not be visible in the course.
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="w-full">
          <Link
            className="mb-6 flex items-center text-sm transition hover:opacity-75"
            href={`/teacher/courses/${courseUrlParam}`}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to course setup
          </Link>
          <div className="flex w-full items-center justify-between">
            <div className="flex flex-col gap-y-2">
              <h1 className="font-medium text-2xl">Module setup</h1>
              <span className="text-slate-700 text-sm">
                Complete all fields {completionText}
              </span>
            </div>
            <ModuleActions
              courseId={courseUrlParam}
              disabled={!isComplete} // Pass slug/id for navigation
              isPublished={moduleData.isPublished} // ID needed for server action
              moduleId={moduleData.id}
            />
          </div>
        </div>
      </div>
      <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-x-2">
              <h2 className="text-xl">Customize your module</h2>
            </div>
            <ModuleTitleForm
              courseId={course.id}
              initialData={moduleData} // Actions need real ID
              moduleId={moduleData.id}
            />
            <ModuleDescriptionForm
              courseId={course.id}
              initialData={moduleData}
              moduleId={moduleData.id}
            />
            <ModuleSlugForm
              courseId={course.id}
              initialData={moduleData}
              moduleId={moduleData.id}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-x-2">
            <h2 className="text-xl">Module lessons</h2>
          </div>
          <LessonsForm
            courseId={course.id}
            courseUrlParam={courseUrlParam}
            initialData={moduleData}
            // We need to pass the URL params for navigation inside the form
            moduleId={moduleData.id}
            moduleUrlParam={moduleUrlParam}
          />
        </div>
      </div>
    </div>
  );
};

export default ModuleIdPage;
