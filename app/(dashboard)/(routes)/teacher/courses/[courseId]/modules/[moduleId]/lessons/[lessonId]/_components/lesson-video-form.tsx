"use client";

import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Pencil, PlusCircle, Video } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateLesson } from "@/actions/lesson";

interface LessonVideoFormProps {
  initialData: {
    kpointVideoId: string | null;
    youtubeVideoId: string | null;
  };
  courseId: string;
  moduleId: string;
  lessonId: string;
}

const formSchema = z.object({
  kpointVideoId: z.string().optional(),
  youtubeVideoId: z.string().optional(),
});

export const LessonVideoForm = ({
  initialData,
  courseId,
  moduleId,
  lessonId
}: LessonVideoFormProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();

  const toggleEdit = () => setIsEditing((current) => !current);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      kpointVideoId: initialData.kpointVideoId || "",
      youtubeVideoId: initialData.youtubeVideoId || "",
    },
  });

  const { isSubmitting, isValid } = form.formState;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await updateLesson(lessonId, moduleId, values);
      toast.success("Lesson updated");
      toggleEdit();
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    }
  }

  const hasVideo = initialData.kpointVideoId || initialData.youtubeVideoId;

  return (
    <div className="mt-6 border bg-slate-100 rounded-md p-4">
      <div className="font-medium flex items-center justify-between">
        Lesson video
        <Button onClick={toggleEdit} variant="ghost">
          {isEditing && (
            <>Cancel</>
          )}
          {!isEditing && !hasVideo && (
            <>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add a video
            </>
          )}
          {!isEditing && hasVideo && (
            <>
              <Pencil className="h-4 w-4 mr-2" />
              Edit video
            </>
          )}
        </Button>
      </div>
      {!isEditing && (
        !hasVideo ? (
          <div className="flex items-center justify-center h-60 bg-slate-200 rounded-md">
            <Video className="h-10 w-10 text-slate-500" />
          </div>
        ) : (
          <div className="mt-2 space-y-2">
             {initialData.kpointVideoId && (
               <div className="text-sm">
                 <span className="font-semibold text-sky-700">KPOINT ID:</span> {initialData.kpointVideoId}
               </div>
             )}
             {initialData.youtubeVideoId && (
               <div className="text-sm">
                 <span className="font-semibold text-red-600">YouTube ID:</span> {initialData.youtubeVideoId}
               </div>
             )}
          </div>
        )
      )}
      {isEditing && (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 mt-4"
          >
            <FormField
              control={form.control}
              name="kpointVideoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>KPOINT Video ID</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isSubmitting}
                      placeholder="e.g. 'kp_12345'"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="youtubeVideoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>YouTube Video ID</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isSubmitting}
                      placeholder="e.g. 'dQw4w9WgXcQ'"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="text-xs text-muted-foreground">
              Provide at least one video ID for the lesson.
            </div>
            <div className="flex items-center gap-x-2">
              <Button
                disabled={!isValid || isSubmitting}
                type="submit"
              >
                Save
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  )
}