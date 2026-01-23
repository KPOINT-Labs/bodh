"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Course, Module } from "@prisma/client";
import { Loader2, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { createModule, reorderModules } from "@/actions/module";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ModulesList } from "./modules-list";

interface ModulesFormProps {
  initialData: Course & { modules: Module[] };
  courseId: string;
  courseUrlParam?: string;
}

const formSchema = z.object({
  title: z.string().min(1),
});

export const ModulesForm = ({
  initialData,
  courseId,
  courseUrlParam,
}: ModulesFormProps) => {
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
      await createModule(courseId, values.title);
      toast.success("Module created");
      toggleCreating();
      router.refresh();
      form.reset();
    } catch {
      toast.error("Something went wrong");
    }
  };

  const onReorder = async (
    updateData: { id: string; orderIndex: number }[]
  ) => {
    try {
      setIsUpdating(true);
      await reorderModules(courseId, updateData);
      toast.success("Modules reordered");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsUpdating(false);
    }
  };

  const onEdit = (idOrSlug: string) => {
    // Navigate to Module Edit Page
    const cParam = courseUrlParam || courseId;
    router.push(`/teacher/courses/${cParam}/modules/${idOrSlug}`);
  };

  return (
    <div className="relative mt-6 rounded-md border bg-slate-100 p-4">
      {isUpdating && (
        <div className="absolute top-0 right-0 z-10 flex h-full w-full items-center justify-center rounded-m bg-slate-500/20">
          <Loader2 className="h-6 w-6 animate-spin text-sky-700" />
        </div>
      )}
      <div className="flex items-center justify-between font-medium">
        Course modules
        <Button onClick={toggleCreating} variant="ghost">
          {isCreating ? (
            <>Cancel</>
          ) : (
            <>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add a module
            </>
          )}
        </Button>
      </div>
      {isCreating && (
        <Form {...form}>
          <form
            className="mt-4 space-y-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      disabled={isSubmitting}
                      placeholder="e.g. 'Introduction to the course'"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button disabled={!isValid || isSubmitting} type="submit">
              Create
            </Button>
          </form>
        </Form>
      )}
      {!isCreating && (
        <div
          className={cn(
            "mt-2 text-sm",
            !initialData.modules.length && "text-slate-500 italic"
          )}
        >
          {!initialData.modules.length && "No modules"}
          <ModulesList
            items={initialData.modules || []}
            onEdit={onEdit}
            onReorder={onReorder}
          />
        </div>
      )}
      {!isCreating && (
        <p className="mt-4 text-muted-foreground text-xs">
          Drag and drop to reorder the modules
        </p>
      )}
    </div>
  );
};
