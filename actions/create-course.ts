"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const CreateCourseSchema = z.object({
  title: z.string().min(1, {
    message: "Title is required",
  }),
});

export async function createCourse(prevState: any, formData: FormData) {
  const validatedFields = CreateCourseSchema.safeParse({
    title: formData.get("title"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Create Course.",
    };
  }

  const { title } = validatedFields.data;

  try {
    const course = await prisma.course.create({
      data: {
        title,
      },
    });
    
    // We can't redirect inside a try-catch block in Server Actions if we want to catch errors?
    // Actually, redirect throws an error, so it should be outside or re-thrown.
    // Ideally, return the ID and redirect in the client or redirect here (which stops execution).
    
    // For this simple case, I'll redirect.
  } catch (error) {
    return {
      message: "Database Error: Failed to Create Course.",
    };
  }
  
  // Revalidate is not strictly needed if we redirect to a new page, but good practice if we listed courses.
  revalidatePath("/teacher/courses");
  redirect("/teacher/courses");
}
