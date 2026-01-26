"use client";

import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import type { Lesson } from "@prisma/client";
import { Grip, Pencil, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LessonsListProps {
  items: Lesson[];
  onReorder: (updateData: { id: string; orderIndex: number }[]) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const LessonsList = ({
  items,
  onReorder,
  onEdit,
  onDelete,
}: LessonsListProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const [lessons, setLessons] = useState(items);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setLessons(items);
  }, [items]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const items = Array.from(lessons);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const startIndex = Math.min(result.source.index, result.destination.index);
    const endIndex = Math.max(result.source.index, result.destination.index);

    const updatedLessons = items.slice(startIndex, endIndex + 1);

    setLessons(items);

    const bulkUpdateData = updatedLessons.map((lesson) => ({
      id: lesson.id,
      orderIndex: items.findIndex((item) => item.id === lesson.id) + 1,
    }));

    onReorder(bulkUpdateData);
  };

  if (!isMounted) {
    return null;
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="lessons">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {lessons.map((lesson, index) => (
              <Draggable draggableId={lesson.id} index={index} key={lesson.id}>
                {(provided) => (
                  <div
                    className={cn(
                      "mb-4 flex items-center gap-x-2 rounded-md border border-slate-200 bg-slate-200 text-slate-700 text-sm",
                      lesson.isPublished &&
                        "border-sky-200 bg-sky-100 text-sky-700"
                    )}
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                  >
                    <div
                      className={cn(
                        "rounded-l-md border-r border-r-slate-200 px-2 py-3 transition hover:bg-slate-300",
                        lesson.isPublished &&
                          "border-r-sky-200 hover:bg-sky-200"
                      )}
                      {...provided.dragHandleProps}
                    >
                      <Grip className="h-5 w-5" />
                    </div>
                    <span
                      className="cursor-pointer transition hover:text-sky-700"
                      onClick={() => onEdit(lesson.slug || lesson.id)}
                    >
                      {lesson.title}
                    </span>
                    <div className="ml-auto flex items-center gap-x-2 pr-2">
                      {lesson.isPublished ? (
                        <Badge className="bg-sky-700">Published</Badge>
                      ) : (
                        <Badge className="bg-slate-500">Draft</Badge>
                      )}
                      <Pencil
                        className="h-4 w-4 cursor-pointer transition hover:opacity-75"
                        onClick={() => onEdit(lesson.slug || lesson.id)}
                      />
                      <ConfirmModal onConfirm={() => onDelete(lesson.id)}>
                        <Trash className="h-4 w-4 cursor-pointer text-red-500 transition hover:opacity-75" />
                      </ConfirmModal>
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};
