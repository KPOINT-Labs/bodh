import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LessonActions } from "./_components/lesson-actions";
import { LessonDescriptionForm } from "./_components/lesson-description-form";
import { LessonSlugForm } from "./_components/lesson-slug-form";
import { LessonTitleForm } from "./_components/lesson-title-form";
import { LessonVideoForm } from "./_components/lesson-video-form";

// Render at request time (database required)
export const dynamic = "force-dynamic";

const LessonIdPage = async ({
  params,
}: {
  params: Promise<{ courseId: string; moduleId: string; lessonId: string }>;
}) => {
  const { courseId, moduleId, lessonId } = await params;

  // 1. Resolve Course (Slug first, then ID)
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

  // 2. Resolve Module (Slug first, then ID) - scoped to Course
  let moduleData = await prisma.module.findFirst({
    where: {
      slug: moduleId,
      courseId: course.id,
    },
    select: { id: true, slug: true },
  });

  if (!moduleData) {
    moduleData = await prisma.module.findFirst({
      where: {
        id: moduleId,
        courseId: course.id,
      },
      select: { id: true, slug: true },
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
    },
  });

  if (!lesson) {
    lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        moduleId: moduleData.id,
      },
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
        <div className="mb-6 rounded-md border border-yellow-200 bg-yellow-100 px-4 py-2 font-medium text-sm text-yellow-800">
          This lesson is unpublished. It will not be visible in the course.
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="w-full">
          <Link
            className="mb-6 flex items-center text-sm transition hover:opacity-75"
            href={`/teacher/courses/${courseUrlParam}/modules/${moduleUrlParam}`}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to module setup
          </Link>
          <div className="flex w-full items-center justify-between">
            <div className="flex flex-col gap-y-2">
              <h1 className="font-medium text-2xl">Lesson setup</h1>
              <span className="text-slate-700 text-sm">
                Complete all fields {completionText}
              </span>
            </div>
            <LessonActions
              courseId={course.id}
              disabled={!isComplete}
              isPublished={lesson.isPublished}
              lessonId={lesson.id}
              moduleId={moduleData.id}
            />
          </div>
        </div>
      </div>
      <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-x-2">
              <h2 className="text-xl">Customize your lesson</h2>
            </div>
            <LessonTitleForm
              courseId={course.id}
              initialData={lesson}
              lessonId={lesson.id}
              moduleId={moduleData.id}
            />
            <LessonDescriptionForm
              courseId={course.id}
              initialData={lesson}
              lessonId={lesson.id}
              moduleId={moduleData.id}
            />
            <LessonSlugForm
              courseId={course.id}
              initialData={lesson}
              lessonId={lesson.id}
              moduleId={moduleData.id}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-x-2">
            <h2 className="text-xl">Lesson video</h2>
          </div>
          <LessonVideoForm
            courseId={course.id}
            initialData={lesson}
            lessonId={lesson.id}
            moduleId={moduleData.id}
          />
        </div>
      </div>
    </div>
  );
};

export default LessonIdPage;
