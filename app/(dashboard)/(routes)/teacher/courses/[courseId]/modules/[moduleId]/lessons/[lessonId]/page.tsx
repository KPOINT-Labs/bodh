import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { LessonTitleForm } from "./_components/lesson-title-form";
import { LessonDescriptionForm } from "./_components/lesson-description-form";
import { LessonVideoForm } from "./_components/lesson-video-form";
import { LessonSlugForm } from "./_components/lesson-slug-form";
import { LessonActions } from "./_components/lesson-actions";

const LessonIdPage = async ({
  params
}: {
  params: Promise<{ courseId: string; moduleId: string; lessonId: string }>
}) => {
  const { courseId, moduleId, lessonId } = await params;

  // 1. Resolve Course (Slug first, then ID)
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

  // 2. Resolve Module (Slug first, then ID) - scoped to Course
  let moduleData = await prisma.module.findFirst({
    where: {
      slug: moduleId,
      courseId: course.id,
    },
    select: { id: true, slug: true }
  });

  if (!moduleData) {
    moduleData = await prisma.module.findFirst({
      where: {
        id: moduleId,
        courseId: course.id,
      },
      select: { id: true, slug: true }
    });
  }

  if (!moduleData) {
    return redirect("/");
  }

  // 3. Resolve Lesson (Slug first, then ID) - scoped to Module
  let lesson = await prisma.lesson.findFirst({
    where: {
      slug: lessonId,
      moduleId: moduleData.id,
    }
  });

  if (!lesson) {
    lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        moduleId: moduleData.id,
      }
    });
  }

  if (!lesson) {
    return redirect("/");
  }

  const requiredFields = [
    lesson.title,
    // lesson.description, // Optional for publish
    // lesson.kpointVideoId, // Optional for publish
  ];

  const totalFields = requiredFields.length;
  const completedFields = requiredFields.filter(Boolean).length;

  const completionText = `(${completedFields}/${totalFields})`;

  const isComplete = requiredFields.every(Boolean);

  const courseUrlParam = course.slug || course.id;
  const moduleUrlParam = moduleData.slug || moduleData.id;

  return (
    <div className="p-6">
      {!lesson.isPublished && (
        <div className="bg-yellow-100 border-yellow-200 border text-yellow-800 px-4 py-2 rounded-md mb-6 text-sm font-medium">
          This lesson is unpublished. It will not be visible in the course.
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="w-full">
          <Link
            href={`/teacher/courses/${courseUrlParam}/modules/${moduleUrlParam}`}
            className="flex items-center text-sm hover:opacity-75 transition mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to module setup
          </Link>
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-col gap-y-2">
              <h1 className="text-2xl font-medium">
                Lesson setup
              </h1>
              <span className="text-sm text-slate-700">
                Complete all fields {completionText}
              </span>
            </div>
            <LessonActions
              disabled={!isComplete}
              courseId={course.id}
              moduleId={moduleData.id}
              lessonId={lesson.id}
              isPublished={lesson.isPublished}
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-x-2">
              <h2 className="text-xl">
                Customize your lesson
              </h2>
            </div>
            <LessonTitleForm
              initialData={lesson}
              courseId={course.id}
              moduleId={moduleData.id}
              lessonId={lesson.id}
            />
            <LessonDescriptionForm
              initialData={lesson}
              courseId={course.id}
              moduleId={moduleData.id}
              lessonId={lesson.id}
            />
            <LessonSlugForm
              initialData={lesson}
              courseId={course.id}
              moduleId={moduleData.id}
              lessonId={lesson.id}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-x-2">
             <h2 className="text-xl">
               Lesson video
             </h2>
          </div>
          <LessonVideoForm
            initialData={lesson}
            courseId={course.id}
            moduleId={moduleData.id}
            lessonId={lesson.id}
          />
        </div>
      </div>
    </div>
  );
}

export default LessonIdPage;