"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function deleteCourse(courseId: string) {
  try {
    const course = await prisma.course.delete({
      where: {
        id: courseId,
      },
    });

    revalidatePath("/teacher/courses");
    return course;
  } catch (error) {
    console.log("[COURSE_DELETE]", error);
    throw new Error("Internal Error");
  }
}
