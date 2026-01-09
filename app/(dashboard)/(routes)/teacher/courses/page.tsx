import { prisma } from "@/lib/prisma";
import { DataTable } from "./_components/data-table";
import { columns } from "./_components/columns";

// Render at request time (database required)
export const dynamic = "force-dynamic";

const CoursesPage = async () => {
  const courses = await prisma.course.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="p-6">
      <DataTable columns={columns} data={courses} />
    </div>
  );
};

export default CoursesPage;