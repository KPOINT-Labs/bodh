import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TitleForm } from "./_components/title-form";
import { DescriptionForm } from "./_components/description-form";
import { ImageForm } from "./_components/image-form";
import { CategoryForm } from "./_components/category-form";
import { PriceForm } from "./_components/price-form";
import { AttachmentForm } from "./_components/attachment-form";
import { ModulesForm } from "./_components/modules-form";
import { CourseIdForm } from "./_components/course-id-form";
import { CourseSlugForm } from "./_components/course-slug-form";
import { CourseActions } from "./_components/course-actions";

const CourseIdPage = async ({
  params
}: {
  params: Promise<{ courseId: string }>
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
    course.modules.some(module => module.isPublished), // At least one published module
  ];

  const totalFields = requiredFields.length;
  const completedFields = requiredFields.filter(Boolean).length;

  const completionText = `(${completedFields}/${totalFields})`;

  const isComplete = requiredFields.every(Boolean);

  const courseUrlParam = course.slug || course.id;

  return ( 
    <div className="p-6">
      {!course.isPublished && (
        <div className="bg-yellow-100 border-yellow-200 border text-yellow-800 px-4 py-2 rounded-md mb-6 text-sm font-medium">
          This course is unpublished. It will not be visible to students.
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-y-2 w-full">
          <div className="flex items-center justify-between w-full">
            <div>
              <h1 className="text-2xl font-medium">
                Course setup
              </h1>
              <span className="text-sm text-slate-700">
                Complete all fields {completionText}
              </span>
            </div>
            <CourseActions
              disabled={!isComplete}
              courseId={course.id}
              isPublished={course.isPublished}
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
        <div>
          <div className="flex items-center gap-x-2">
            <h2 className="text-xl">
              Customize your course
            </h2>
          </div>
          <TitleForm
            initialData={course}
            courseId={course.id}
          />
          <DescriptionForm
            initialData={course}
            courseId={course.id}
          />
          <ImageForm
            initialData={course}
            courseId={course.id}
          />
          <CategoryForm
            initialData={course}
            courseId={course.id}
            options={categories.map((category) => ({
              label: category.name,
              value: category.id,
            }))}
          />
        </div>
        <div className="space-y-6">
           <div>
             <div className="flex items-center gap-x-2">
               <h2 className="text-xl">
                 Course Identifiers
               </h2>
             </div>
             <CourseIdForm
               initialData={course}
               courseId={course.id}
             />
             <CourseSlugForm
               initialData={course}
               courseId={course.id}
             />
           </div>
           <div>
             <div className="flex items-center gap-x-2">
               <h2 className="text-xl">
                 Course modules
               </h2>
             </div>
             <ModulesForm
               initialData={course}
               courseId={course.id}
               courseUrlParam={courseUrlParam}
             />
           </div>
           <div>
             <div className="flex items-center gap-x-2">
               <h2 className="text-xl">
                 Sell your course
               </h2>
             </div>
             <PriceForm
               initialData={course}
               courseId={course.id}
             />
           </div>
           <div>
             <div className="flex items-center gap-x-2">
               <h2 className="text-xl">
                 Resources & Attachments
               </h2>
             </div>
             <AttachmentForm
               initialData={course}
               courseId={course.id}
             />
           </div>
        </div>
      </div>
    </div>
   );
}
 
export default CourseIdPage;
