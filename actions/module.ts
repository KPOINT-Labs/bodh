"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createModule(courseId: string, title: string) {
  try {
    const lastModule = await prisma.module.findFirst({
      where: {
        courseId: courseId,
      },
      orderBy: {
        orderIndex: "desc",
      },
    });

    const newOrderIndex = lastModule ? lastModule.orderIndex + 1 : 1;

    const module = await prisma.module.create({
      data: {
        title,
        courseId,
        orderIndex: newOrderIndex,
      },
    });

    revalidatePath(`/teacher/courses/${courseId}`);
    return module;
  } catch (error) {
    console.log("[MODULE_CREATE]", error);
    throw new Error("Internal Error");
  }
}

export async function updateModule(moduleId: string, courseId: string, values: { title?: string; description?: string; isPublished?: boolean; orderIndex?: number }) {
  try {
    const module = await prisma.module.update({
      where: {
        id: moduleId,
        courseId: courseId,
      },
      data: {
        ...values,
      },
    });

    revalidatePath(`/teacher/courses/${courseId}`);
    return module;
  } catch (error) {
    console.log("[MODULE_UPDATE]", error);
    throw new Error("Internal Error");
  }
}

export async function deleteModule(moduleId: string, courseId: string) {
  try {
    const module = await prisma.module.delete({
      where: {
        id: moduleId,
        courseId: courseId,
      },
    });

    revalidatePath(`/teacher/courses/${courseId}`);
    return module;
  } catch (error) {
    console.log("[MODULE_DELETE]", error);
    throw new Error("Internal Error");
  }
}

export async function reorderModules(courseId: string, updateData: { id: string; orderIndex: number }[]) {
  try {
    for (const item of updateData) {
      await prisma.module.update({
        where: { id: item.id },
        data: { orderIndex: item.orderIndex },
      });
    }

    revalidatePath(`/teacher/courses/${courseId}`);
  } catch (error) {
    console.log("[MODULE_REORDER]", error);
    throw new Error("Internal Error");
  }
}
