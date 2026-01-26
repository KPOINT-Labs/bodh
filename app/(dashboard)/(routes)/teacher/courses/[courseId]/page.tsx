import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AttachmentForm } from "./_components/attachment-form";
import { CategoryForm } from "./_components/category-form";
import { CourseActions } from "./_components/course-actions";
import { CourseIdForm } from "./_components/course-id-form";
import { CourseSlugForm } from "./_components/course-slug-form";
import { DescriptionForm } from "./_components/description-form";
import { ImageForm } from "./_components/image-form";
import { ModulesForm } from "./_components/modules-form";
import { PriceForm } from "./_components/price-form";
import { TitleForm } from "./_components/title-form";

// Render at request time (database required)
export const dynamic = "force-dynamic";

const CourseIdPage = async ({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) => {
  const { courseId } = await params;

  // Try to find by Slug first, then by ID
  let course = await prisma.course.findUnique({
    where: { slug: courseId },
    include: {
      attachments: { orderBy: { createdAt: "desc" } },
      modules: { orderBy: { orderIndex: "asc" } },
    },
  });

  if (!course) {
    course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        attachments: { orderBy: { createdAt: "desc" } },
        modules: { orderBy: { orderIndex: "asc" } },
      },
    });
  }

  const categories = await prisma.category.findMany({
    orderBy: {
      name: "asc",
    },
  });

  if (!course) {
    return redirect("/");
  }

  const requiredFields = [
    course.title,
    course.description,
    // course.thumbnail, // Optional for publish
    // course.price, // Optional for publish
    // course.categoryId, // Optional for publish
    course.modules.some((module) => module.isPublished), // At least one published module
  ];

  const totalFields = requiredFields.length;
  const completedFields = requiredFields.filter(Boolean).length;

  const completionText = `(${completedFields}/${totalFields})`;

  const isComplete = requiredFields.every(Boolean);

  const courseUrlParam = course.slug || course.id;

  return (
    <div className="p-6">
      {!course.isPublished && (
        <div className="mb-6 rounded-md border border-yellow-200 bg-yellow-100 px-4 py-2 font-medium text-sm text-yellow-800">
          This course is unpublished. It will not be visible to students.
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex w-full flex-col gap-y-2">
          <div className="flex w-full items-center justify-between">
            <div>
              <h1 className="font-medium text-2xl">Course setup</h1>
              <span className="text-slate-700 text-sm">
                Complete all fields {completionText}
              </span>
            </div>
            <CourseActions
              courseId={course.id}
              disabled={!isComplete}
              isPublished={course.isPublished}
            />
          </div>
        </div>
      </div>
      <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <div className="flex items-center gap-x-2">
            <h2 className="text-xl">Customize your course</h2>
          </div>
          <TitleForm courseId={course.id} initialData={course} />
          <DescriptionForm courseId={course.id} initialData={course} />
          <ImageForm courseId={course.id} initialData={course} />
          <CategoryForm
            courseId={course.id}
            initialData={course}
            options={categories.map((category) => ({
              label: category.name,
              value: category.id,
            }))}
          />
        </div>
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-x-2">
              <h2 className="text-xl">Course Identifiers</h2>
            </div>
            <CourseIdForm courseId={course.id} initialData={course} />
            <CourseSlugForm courseId={course.id} initialData={course} />
          </div>
          <div>
            <div className="flex items-center gap-x-2">
              <h2 className="text-xl">Course modules</h2>
            </div>
            <ModulesForm
              courseId={course.id}
              courseUrlParam={courseUrlParam}
              initialData={course}
            />
          </div>
          <div>
            <div className="flex items-center gap-x-2">
              <h2 className="text-xl">Sell your course</h2>
            </div>
            <PriceForm courseId={course.id} initialData={course} />
          </div>
          <div>
            <div className="flex items-center gap-x-2">
              <h2 className="text-xl">Resources & Attachments</h2>
            </div>
            <AttachmentForm courseId={course.id} initialData={course} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseIdPage;
