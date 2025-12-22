"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createAttachment(courseId: string, url: string, name: string) {
  try {
    const attachment = await prisma.attachment.create({
      data: {
        url,
        name: name || url.split("/").pop() || "Attachment",
        courseId: courseId,
      }
    });

    revalidatePath(`/teacher/courses/${courseId}`);
    return attachment;
  } catch (error) {
    console.log("[ATTACHMENT_CREATE]", error);
    throw new Error("Internal Error");
  }
}

export async function deleteAttachment(attachmentId: string, courseId: string) {
  try {
    const attachment = await prisma.attachment.delete({
      where: {
        id: attachmentId,
        courseId: courseId, // Ensure ownership check implicitly if needed (though courseId is enough for revalidate)
      }
    });

    revalidatePath(`/teacher/courses/${courseId}`);
    return attachment;
  } catch (error) {
    console.log("[ATTACHMENT_DELETE]", error);
    throw new Error("Internal Error");
  }
}
