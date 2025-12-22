import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ModuleTitleForm } from "./_components/module-title-form";
import { ModuleDescriptionForm } from "./_components/module-description-form";
import { LessonsForm } from "./_components/lessons-form";

const ModuleIdPage = async ({
  params
}: {
  params: Promise<{ courseId: string; moduleId: string }>
}) => {
  const { courseId, moduleId } = await params;

  const moduleData = await prisma.module.findUnique({
    where: {
      id: moduleId,
      courseId: courseId,
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
    return redirect("/");
  }

  const requiredFields = [
    moduleData.title,
    moduleData.description,
    moduleData.lessons.some(lesson => lesson.isPublished), // At least one published lesson
  ];

  const totalFields = requiredFields.length;
  const completedFields = requiredFields.filter(Boolean).length;

  const completionText = `(${completedFields}/${totalFields})`;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div className="w-full">
          <Link
            href={`/teacher/courses/${courseId}`}
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
              courseId={courseId}
              moduleId={moduleData.id}
            />
            <ModuleDescriptionForm
              initialData={moduleData}
              courseId={courseId}
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
            courseId={courseId}
          />
        </div>
      </div>
    </div>
  );
}

export default ModuleIdPage;
