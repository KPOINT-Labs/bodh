"use client";

import { Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { deleteModule, updateModule } from "@/actions/module";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { Button } from "@/components/ui/button";

interface ModuleActionsProps {
  disabled: boolean;
  courseId: string;
  moduleId: string;
  isPublished: boolean;
}

export const ModuleActions = ({
  disabled,
  courseId,
  moduleId,
  isPublished,
}: ModuleActionsProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const onClick = async () => {
    try {
      setIsLoading(true);

      if (isPublished) {
        await updateModule(moduleId, courseId, { isPublished: false });
        toast.success("Module unpublished");
      } else {
        await updateModule(moduleId, courseId, { isPublished: true });
        toast.success("Module published");
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

      await deleteModule(moduleId, courseId);

      toast.success("Module deleted");
      router.push(`/teacher/courses/${courseId}`);
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
