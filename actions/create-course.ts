"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const CreateCourseSchema = z.object({
  title: z.string().min(1, {
    message: "Title is required",
  }),
  slug: z.string().min(1, {
    message: "Slug is required",
  }).regex(/^[a-z0-9-]+$/, {
    message: "Slug must only contain lowercase letters, numbers, and hyphens",
  }),
  course_id: z.string().min(1, {
    message: "Course ID is required",
  }),
});

export async function createCourse(prevState: any, formData: FormData) {
  const validatedFields = CreateCourseSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    course_id: formData.get("course_id"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Create Course.",
    };
  }

  const { title, slug, course_id } = validatedFields.data;

  let course;

  try {
    // Check if slug exists
    const existingSlug = await prisma.course.findUnique({
        where: { slug }
    });

    if (existingSlug) {
        return {
            errors: {
                slug: ["Slug is already taken."]
            },
            message: "Slug must be unique."
        };
    }

    // Check if course_id exists
    const existingId = await prisma.course.findUnique({
        where: { course_id } // Note: Prisma maps this to course_id
    });

    if (existingId) {
        return {
            errors: {
                course_id: ["Course ID is already taken."]
            },
            message: "Course ID must be unique."
        };
    }

    course = await prisma.course.create({
      data: {
        title,
        slug,
        course_id,
      },
    });
  } catch (error) {
    console.error(error);
    return {
      message: "Database Error: Failed to Create Course.",
    };
  }
  
  revalidatePath("/teacher/courses");
  redirect(`/teacher/courses/${course.slug}`); // Redirect to slug
}
