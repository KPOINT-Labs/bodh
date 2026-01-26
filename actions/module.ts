"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

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
        courseId,
      },
      orderBy: {
        orderIndex: "desc",
      },
    });

    const newOrderIndex = lastModule ? lastModule.orderIndex + 1 : 1;
    const slug = generateSlug(title);

    const createdModule = await prisma.module.create({
      data: {
        title,
        slug,
        courseId,
        orderIndex: newOrderIndex,
      },
    });

    revalidatePath(`/teacher/courses/${courseId}`);
    return createdModule;
  } catch (error) {
    console.log("[MODULE_CREATE]", error);
    throw new Error("Internal Error");
  }
}

export async function updateModule(
  moduleId: string,
  courseId: string,
  values: {
    title?: string;
    description?: string;
    isPublished?: boolean;
    orderIndex?: number;
    slug?: string;
  }
) {
  try {
    // If title is updated, we might want to update slug too, but usually slugs are permanent.
    // We'll let slug be updated explicitly or not at all.
    // If user provides slug in values, use it.

    const updatedModule = await prisma.module.update({
      where: {
        id: moduleId,
        courseId,
      },
      data: {
        ...values,
      },
    });

    revalidatePath(`/teacher/courses/${courseId}`);
    return updatedModule;
  } catch (error) {
    console.log("[MODULE_UPDATE]", error);
    throw new Error("Internal Error");
  }
}

export async function deleteModule(moduleId: string, courseId: string) {
  try {
    const deletedModule = await prisma.module.delete({
      where: {
        id: moduleId,
        courseId,
      },
    });

    revalidatePath(`/teacher/courses/${courseId}`);
    return deletedModule;
  } catch (error) {
    console.log("[MODULE_DELETE]", error);
    throw new Error("Internal Error");
  }
}

export async function reorderModules(
  courseId: string,
  updateData: { id: string; orderIndex: number }[]
) {
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
