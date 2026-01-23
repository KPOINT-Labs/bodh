"use client";

import { Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { deleteCourse } from "@/actions/delete-course"; // Need to create this
import { updateCourse } from "@/actions/update-course";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { Button } from "@/components/ui/button";

interface CourseActionsProps {
  disabled: boolean;
  courseId: string;
  isPublished: boolean;
}

export const CourseActions = ({
  disabled,
  courseId,
  isPublished,
}: CourseActionsProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const onClick = async () => {
    try {
      setIsLoading(true);

      if (isPublished) {
        await updateCourse(courseId, { isPublished: false });
        toast.success("Course unpublished");
      } else {
        await updateCourse(courseId, { isPublished: true });
        toast.success("Course published");
      }

      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setIsLoading(true);

      await deleteCourse(courseId);

      toast.success("Course deleted");
      router.push("/teacher/courses");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-x-2">
      <Button
        disabled={disabled || isLoading}
        onClick={onClick}
        size="sm"
        variant="outline"
      >
        {isPublished ? "Unpublish" : "Publish"}
      </Button>
      <ConfirmModal onConfirm={onDelete}>
        <Button disabled={isLoading} size="sm">
          <Trash className="h-4 w-4 text-red-500" />
        </Button>
      </ConfirmModal>
    </div>
  );
};
