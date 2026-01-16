"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function generateSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function createLesson(moduleId: string, title: string) {
  try {
    const courseModule = await prisma.module.findUnique({
      where: { id: moduleId },
      select: { courseId: true }
    });

    if (!courseModule) {
      throw new Error("Module not found");
    }

    const lastLesson = await prisma.lesson.findFirst({
      where: {
        moduleId: moduleId,
      },
      orderBy: {
        orderIndex: "desc",
      },
    });

    const newOrderIndex = lastLesson ? lastLesson.orderIndex + 1 : 1;
    const slug = generateSlug(title);

    const lesson = await prisma.lesson.create({
      data: {
        title,
        slug,
        moduleId,
        courseId: courseModule.courseId,
        orderIndex: newOrderIndex,
      },
    });

    revalidatePath(`/teacher/courses/${courseModule.courseId}/modules/${moduleId}`);
    return lesson;
  } catch (error) {
    console.log("[LESSON_CREATE]", error);
    throw new Error("Internal Error");
  }
}

export async function updateLesson(lessonId: string, moduleId: string, values: { title?: string; description?: string; isPublished?: boolean; orderIndex?: number; kpointVideoId?: string; youtubeVideoId?: string; slug?: string }) {
  try {
    const lesson = await prisma.lesson.update({
      where: {
        id: lessonId,
        moduleId: moduleId,
      },
      data: {
        ...values,
      },
    });
    
    const courseModule = await prisma.module.findUnique({ where: { id: moduleId } });
    if (courseModule) {
        revalidatePath(`/teacher/courses/${courseModule.courseId}/modules/${moduleId}`);
        revalidatePath(`/teacher/courses/${courseModule.courseId}/modules/${moduleId}/lessons/${lessonId}`);
    }
    return lesson;
  } catch (error) {
    console.log("[LESSON_UPDATE]", error);
    throw new Error("Internal Error");
  }
}

export async function deleteLesson(lessonId: string, moduleId: string) {
  try {
    const lesson = await prisma.lesson.delete({
      where: {
        id: lessonId,
        moduleId: moduleId,
      },
    });

    const courseModule = await prisma.module.findUnique({ where: { id: moduleId } });
    if (courseModule) {
        revalidatePath(`/teacher/courses/${courseModule.courseId}/modules/${moduleId}`);
    }
    return lesson;
  } catch (error) {
    console.log("[LESSON_DELETE]", error);
    throw new Error("Internal Error");
  }
}

export async function reorderLessons(moduleId: string, updateData: { id: string; orderIndex: number }[]) {
  try {
    for (const item of updateData) {
      await prisma.lesson.update({
        where: { id: item.id },
        data: { orderIndex: item.orderIndex },
      });
    }

    const courseModule = await prisma.module.findUnique({ where: { id: moduleId } });
    if (courseModule) {
        revalidatePath(`/teacher/courses/${courseModule.courseId}/modules/${moduleId}`);
    }
  } catch (error) {
    console.log("[LESSON_REORDER]", error);
    throw new Error("Internal Error");
  }
}
