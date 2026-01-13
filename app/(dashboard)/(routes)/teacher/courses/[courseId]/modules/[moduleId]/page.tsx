import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ModuleTitleForm } from "./_components/module-title-form";
import { ModuleDescriptionForm } from "./_components/module-description-form";
import { LessonsForm } from "./_components/lessons-form";
import { ModuleSlugForm } from "./_components/module-slug-form";
import { ModuleActions } from "./_components/module-actions";

// Render at request time (database required)
export const dynamic = "force-dynamic";

const ModuleIdPage = async ({
  params
}: {
  params: Promise<{ courseId: string; moduleId: string }>
}) => {
  const { courseId, moduleId } = await params;

  // Resolve Course (Slug first, then ID)
  let course = await prisma.course.findUnique({
    where: { slug: courseId },
    select: { id: true, slug: true }
  });

  if (!course) {
    course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, slug: true }
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
    moduleData.lessons.some(lesson => lesson.isPublished), // At least one published lesson
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
        <div className="bg-yellow-100 border-yellow-200 border text-yellow-800 px-4 py-2 rounded-md mb-6 text-sm font-medium">
          This module is unpublished. It will not be visible in the course.
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="w-full">
          <Link
            href={`/teacher/courses/${courseUrlParam}`}
            className="flex items-center text-sm hover:opacity-75 transition mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to course setup
          </Link>
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-col gap-y-2">
              <h1 className="text-2xl font-medium">
                Module setup
              </h1>
              <span className="text-sm text-slate-700">
                Complete all fields {completionText}
              </span>
            </div>
            <ModuleActions
              disabled={!isComplete}
              courseId={courseUrlParam} // Pass slug/id for navigation
              moduleId={moduleData.id} // ID needed for server action
              isPublished={moduleData.isPublished}
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-x-2">
              <h2 className="text-xl">
                Customize your module
              </h2>
            </div>
            <ModuleTitleForm
              initialData={moduleData}
              courseId={course.id} // Actions need real ID
              moduleId={moduleData.id}
            />
            <ModuleDescriptionForm
              initialData={moduleData}
              courseId={course.id}
              moduleId={moduleData.id}
            />
            <ModuleSlugForm
              initialData={moduleData}
              courseId={course.id}
              moduleId={moduleData.id}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-x-2">
             <h2 className="text-xl">
               Module lessons
             </h2>
          </div>
          <LessonsForm
            initialData={moduleData}
            moduleId={moduleData.id}
            courseId={course.id} 
            // We need to pass the URL params for navigation inside the form
            courseUrlParam={courseUrlParam}
            moduleUrlParam={moduleUrlParam}
          />
        </div>
      </div>
    </div>
  );
}

export default ModuleIdPage;