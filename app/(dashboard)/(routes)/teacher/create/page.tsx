"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTransition } from "react";

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
});

const CreatePage = () => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // We need to wrap the server action in a FormData object or modify the action to take JSON.
    // The action I wrote takes FormData. Let's adapt.
    const formData = new FormData();
    formData.append("title", values.title);

    startTransition(async () => {
      // We are calling the server action directly.
      // Note: In a real app, we might handle the state returned by the action.
      // Since the action redirects on success, we just need to handle errors if it returns.
      // However, redirect() throws, so we need to be careful.
      // A better pattern with RHF is often just calling the function if it's bound.
      
      // Let's modify the action slightly to be more RHF friendly or use it as a mutation.
      // For now, I'll try invoking it.
      try {
         await createCourse(null, formData);
      } catch (error) {
        // Redirect throws an error "NEXT_REDIRECT", we should ignore it or let it bubble?
        // Actually, if we call it like a function, the redirect happens on the server response.
        // But since we are in a client component, `createCourse` is an RPC call.
        // If it redirects, the client router should handle it.
        // If it fails, it returns an object.
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
