"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, PlusCircle, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { updateLesson } from "@/actions/lesson";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

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
  lessonId,
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
  };

  const hasVideo = initialData.kpointVideoId || initialData.youtubeVideoId;

  return (
    <div className="mt-6 rounded-md border bg-slate-100 p-4">
      <div className="flex items-center justify-between font-medium">
        Lesson video
        <Button onClick={toggleEdit} variant="ghost">
          {isEditing && <>Cancel</>}
          {!(isEditing || hasVideo) && (
            <>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add a video
            </>
          )}
          {!isEditing && hasVideo && (
            <>
              <Pencil className="mr-2 h-4 w-4" />
              Edit video
            </>
          )}
        </Button>
      </div>
      {!isEditing &&
        (hasVideo ? (
          <div className="mt-2 space-y-2">
            {initialData.kpointVideoId && (
              <div className="text-sm">
                <span className="font-semibold text-sky-700">KPOINT ID:</span>{" "}
                {initialData.kpointVideoId}
              </div>
            )}
            {initialData.youtubeVideoId && (
              <div className="text-sm">
                <span className="font-semibold text-red-600">YouTube ID:</span>{" "}
                {initialData.youtubeVideoId}
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-60 items-center justify-center rounded-md bg-slate-200">
            <Video className="h-10 w-10 text-slate-500" />
          </div>
        ))}
      {isEditing && (
        <Form {...form}>
          <form
            className="mt-4 space-y-4"
            onSubmit={form.handleSubmit(onSubmit)}
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
            <div className="text-muted-foreground text-xs">
              Provide at least one video ID for the lesson.
            </div>
            <div className="flex items-center gap-x-2">
              <Button disabled={!isValid || isSubmitting} type="submit">
                Save
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
};
