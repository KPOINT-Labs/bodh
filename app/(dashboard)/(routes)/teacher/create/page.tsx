"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTransition, useEffect } from "react";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCourse } from "@/actions/create-course";

const formSchema = z.object({
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

const CreatePage = () => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      slug: "",
      course_id: "",
    },
  });

  const { watch, setValue } = form;
  const title = watch("title");

  // Auto-generate slug from title
  useEffect(() => {
    if (title) {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      setValue("slug", slug, { shouldValidate: true });
    }
  }, [title, setValue]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const formData = new FormData();
    formData.append("title", values.title);
    formData.append("slug", values.slug);
    formData.append("course_id", values.course_id);

    startTransition(async () => {
      try {
         const result = await createCourse(undefined, formData);
         if (result?.errors) {
            // Handle validation errors from server
            if (result.errors.slug) {
                form.setError("slug", { message: result.errors.slug[0] });
            }
            if (result.errors.course_id) {
                form.setError("course_id", { message: result.errors.course_id[0] });
            }
            toast.error(result.message || "Validation failed");
         } else if (result?.message) {
             toast.error(result.message);
         }
      } catch (error) {
        toast.error("Something went wrong");
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto flex md:items-center md:justify-center h-full p-6">
      <div className="w-full max-w-2xl bg-white p-8 rounded-xl shadow-sm border">
        <h1 className="text-2xl font-bold text-sky-900 mb-2">Name your course</h1>
        <p className="text-slate-500 mb-8">
          What would you like to name your course? Don&apos;t worry, you can
          change this later.
        </p>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-8 mt-8"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Title</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isPending}
                      placeholder="e.g. 'Advanced Web Development'"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    What will you teach in this course?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL Slug</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isPending}
                          placeholder="e.g. 'advanced-web-dev'"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Friendly URL identifier.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="course_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course ID</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isPending}
                          placeholder="e.g. 'CS-101'"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Internal or Catalog ID.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <div className="flex items-center gap-x-2">
              <Link href="/teacher/courses">
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isPending}>
                Continue
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default CreatePage;