"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function generateSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

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
    const slug = generateSlug(title);

    const module = await prisma.module.create({
      data: {
        title,
        slug,
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

export async function updateModule(moduleId: string, courseId: string, values: { title?: string; description?: string; isPublished?: boolean; orderIndex?: number; slug?: string }) {
  try {
    // If title is updated, we might want to update slug too, but usually slugs are permanent.
    // We'll let slug be updated explicitly or not at all.
    // If user provides slug in values, use it.
    
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