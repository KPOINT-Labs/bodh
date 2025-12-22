"use client";

import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, PlusCircle } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lesson, Module } from "@prisma/client";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createLesson, reorderLessons, deleteLesson } from "@/actions/lesson";
import { LessonsList } from "./lessons-list";

interface LessonsFormProps {
  initialData: Module & { lessons: Lesson[] };
  moduleId: string;
  courseId: string;
  courseUrlParam?: string; // Add optional params for navigation
  moduleUrlParam?: string;
}

const formSchema = z.object({
  title: z.string().min(1),
});

export const LessonsForm = ({
  initialData,
  moduleId,
  courseId,
  courseUrlParam,
  moduleUrlParam
}: LessonsFormProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const router = useRouter();

  const toggleCreating = () => setIsCreating((current) => !current);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
    },
  });

  const { isSubmitting, isValid } = form.formState;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await createLesson(moduleId, values.title);
      toast.success("Lesson created");
      toggleCreating();
      router.refresh();
      form.reset();
    } catch {
      toast.error("Something went wrong");
    }
  }

  const onReorder = async (updateData: { id: string; orderIndex: number }[]) => {
    try {
      setIsUpdating(true);
      await reorderLessons(moduleId, updateData);
      toast.success("Lessons reordered");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsUpdating(false);
    }
  }

  const onEdit = (idOrSlug: string) => {
    // Use params if available, otherwise fallback to IDs
    const cParam = courseUrlParam || courseId;
    const mParam = moduleUrlParam || moduleId;
    router.push(`/teacher/courses/${cParam}/modules/${mParam}/lessons/${idOrSlug}`);
  }

  const onDelete = async (id: string) => {
    try {
      setIsUpdating(true);
      await deleteLesson(id, moduleId);
      toast.success("Lesson deleted");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="mt-6 border bg-slate-100 rounded-md p-4 relative">
      {isUpdating && (
        <div className="absolute h-full w-full bg-slate-500/20 top-0 right-0 rounded-m flex items-center justify-center z-10">
          <Loader2 className="animate-spin h-6 w-6 text-sky-700" />
        </div>
      )}
      <div className="font-medium flex items-center justify-between">
        Module lessons
        <Button onClick={toggleCreating} variant="ghost">
          {isCreating ? (
            <>Cancel</>
          ) : (
            <>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add a lesson
            </>
          )}
        </Button>
      </div>
      {isCreating && (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 mt-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      disabled={isSubmitting}
                      placeholder="e.g. 'Introduction to the lesson'"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              disabled={!isValid || isSubmitting}
              type="submit"
            >
              Create
            </Button>
          </form>
        </Form>
      )}
      {!isCreating && (
        <div className={cn(
          "text-sm mt-2",
          !initialData.lessons.length && "text-slate-500 italic"
        )}>
          {!initialData.lessons.length && "No lessons"}
          <LessonsList
            onEdit={onEdit}
            onReorder={onReorder}
            onDelete={onDelete}
            items={initialData.lessons || []}
          />
        </div>
      )}
      {!isCreating && (
        <p className="text-xs text-muted-foreground mt-4">
          Drag and drop to reorder the lessons
        </p>
      )}
    </div>
  )
}
