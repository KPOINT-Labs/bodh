"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateCourse(courseId: string, values: { title?: string; description?: string; price?: number; isPublished?: boolean; categoryId?: string; imageUrl?: string }) {
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
