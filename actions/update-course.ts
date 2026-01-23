"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function updateCourse(
  courseId: string,
  values: {
    title?: string;
    description?: string;
    price?: number;
    isPublished?: boolean;
    categoryId?: string;
    thumbnail?: string;
    slug?: string;
    course_id?: string;
  }
) {
  try {
    const course = await prisma.course.update({
      where: {
        id: courseId,
      },
      data: {
        ...values,
      },
    });

    revalidatePath(`/teacher/courses/${courseId}`);
    return course;
  } catch (error) {
    console.log("[COURSE_UPDATE]", error);
    throw new Error("Internal Error");
  }
}
