"use client";

import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, PlusCircle } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Module, Course } from "@prisma/client";

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
import { createModule, reorderModules } from "@/actions/module";
import { ModulesList } from "./modules-list";

interface ModulesFormProps {
  initialData: Course & { modules: Module[] };
  courseId: string;
}

const formSchema = z.object({
  title: z.string().min(1),
});

export const ModulesForm = ({
  initialData,
  courseId
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
  }

  const onReorder = async (updateData: { id: string; orderIndex: number }[]) => {
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
  }

  const onEdit = (id: string) => {
    // For now, no edit page for module. Wait, plan says "Module Management"
    // "Phase 3: Module & Lesson Management"
    // Task: Implement Module Management
    //   - Create Module List component within the Course Edit page (Done)
    //   - Implement Module creation/reordering logic (Done)
    //
    // But I also need to EDIT a module (add lessons to it).
    // So I need a route /teacher/courses/[courseId]/modules/[moduleId]
    router.push(`/teacher/courses/${courseId}/modules/${id}`);
  }

  return (
    <div className="mt-6 border bg-slate-100 rounded-md p-4 relative">
      {isUpdating && (
        <div className="absolute h-full w-full bg-slate-500/20 top-0 right-0 rounded-m flex items-center justify-center z-10">
          <Loader2 className="animate-spin h-6 w-6 text-sky-700" />
        </div>
      )}
      <div className="font-medium flex items-center justify-between">
        Course modules
        <Button onClick={toggleCreating} variant="ghost">
          {isCreating ? (
            <>Cancel</>
          ) : (
            <>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add a module
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
                      placeholder="e.g. 'Introduction to the course'"
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
          !initialData.modules.length && "text-slate-500 italic"
        )}>
          {!initialData.modules.length && "No modules"}
          <ModulesList
            onEdit={onEdit}
            onReorder={onReorder}
            items={initialData.modules || []}
          />
        </div>
      )}
      {!isCreating && (
        <p className="text-xs text-muted-foreground mt-4">
          Drag and drop to reorder the modules
        </p>
      )}
    </div>
  )
}
