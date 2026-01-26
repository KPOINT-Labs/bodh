"use client";

import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import type { Module } from "@prisma/client";
import { Grip, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ModulesListProps {
  items: Module[];
  onReorder: (updateData: { id: string; orderIndex: number }[]) => void;
  onEdit: (id: string) => void;
}

export const ModulesList = ({ items, onReorder, onEdit }: ModulesListProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const [modules, setModules] = useState(items);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setModules(items);
  }, [items]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const items = Array.from(modules);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const startIndex = Math.min(result.source.index, result.destination.index);
    const endIndex = Math.max(result.source.index, result.destination.index);

    const updatedModules = items.slice(startIndex, endIndex + 1);

    setModules(items);

    const bulkUpdateData = updatedModules.map((module) => ({
      id: module.id,
      orderIndex: items.findIndex((item) => item.id === module.id) + 1,
    }));

    onReorder(bulkUpdateData);
  };

  if (!isMounted) {
    return null;
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="modules">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {modules.map((module, index) => (
              <Draggable draggableId={module.id} index={index} key={module.id}>
                {(provided) => (
                  <div
                    className={cn(
                      "mb-4 flex items-center gap-x-2 rounded-md border border-slate-200 bg-slate-200 text-slate-700 text-sm",
                      module.isPublished &&
                        "border-sky-200 bg-sky-100 text-sky-700"
                    )}
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                  >
                    <div
                      className={cn(
                        "rounded-l-md border-r border-r-slate-200 px-2 py-3 transition hover:bg-slate-300",
                        module.isPublished &&
                          "border-r-sky-200 hover:bg-sky-200"
                      )}
                      {...provided.dragHandleProps}
                    >
                      <Grip className="h-5 w-5" />
                    </div>
                    <span
                      className="cursor-pointer transition hover:text-sky-700"
                      onClick={() => onEdit(module.slug || module.id)}
                    >
                      {module.title}
                    </span>
                    <div className="ml-auto flex items-center gap-x-2 pr-2">
                      {module.isPublished ? (
                        <Badge className="bg-sky-700">Published</Badge>
                      ) : (
                        <Badge className="bg-slate-500">Draft</Badge>
                      )}
                      <Pencil
                        className="h-4 w-4 cursor-pointer transition hover:opacity-75"
                        onClick={() => onEdit(module.slug || module.id)}
                      />
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
