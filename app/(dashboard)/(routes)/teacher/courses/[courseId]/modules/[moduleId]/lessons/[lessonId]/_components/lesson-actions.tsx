"use client";

import { Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { deleteLesson, updateLesson } from "@/actions/lesson";

interface LessonActionsProps {
  disabled: boolean;
  courseId: string;
  moduleId: string;
  lessonId: string;
  isPublished: boolean;
}

export const LessonActions = ({
  disabled,
  courseId,
  moduleId,
  lessonId,
  isPublished
}: LessonActionsProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const onClick = async () => {
    try {
      setIsLoading(true);

      if (isPublished) {
        await updateLesson(lessonId, moduleId, { isPublished: false });
        toast.success("Lesson unpublished");
      } else {
        await updateLesson(lessonId, moduleId, { isPublished: true });
        toast.success("Lesson published");
      }

      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  const onDelete = async () => {
    try {
      setIsLoading(true);

      await deleteLesson(lessonId, moduleId);

      toast.success("Lesson deleted");
      router.push(`/teacher/courses/${courseId}/modules/${moduleId}`);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-x-2">
      <Button
        onClick={onClick}
        disabled={disabled || isLoading}
        variant="outline"
        size="sm"
      >
        {isPublished ? "Unpublish" : "Publish"}
      </Button>
      <ConfirmModal onConfirm={onDelete}>
        <Button size="sm" disabled={isLoading}>
          <Trash className="h-4 w-4 text-red-500" />
        </Button>
      </ConfirmModal>
    </div>
  );
}
