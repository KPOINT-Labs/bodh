import { prisma } from "@/lib/prisma";
import { columns } from "./_components/columns";
import { DataTable } from "./_components/data-table";

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
