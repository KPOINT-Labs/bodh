"use client";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Monitor,
} from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getModuleStatusText,
  getStatusColor,
  getStatusText,
  getStatusTextColor,
} from "@/lib/learning/status";
import type { Course, Lesson, Module } from "@/types/learning";
import { PanelHeader } from "./PanelHeader";

interface LessonItemProps {
  lesson: Lesson;
  onClick: () => void;
}

function LessonItem({ lesson, onClick }: LessonItemProps) {
  const statusText = getStatusText(lesson.status);
  const statusTextColor = getStatusTextColor(lesson.status);

  return (
    <button
      className="group flex w-full items-center gap-2 rounded py-1 transition-colors hover:bg-gray-50"
      onClick={onClick}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${getStatusColor(lesson.status)} shrink-0`}
      />
      <span className="flex-1 text-left text-gray-700 text-sm group-hover:text-gray-900">
        {lesson.title}
      </span>
      {statusText && (
        <span className={`text-xs ${statusTextColor}`}>{statusText}</span>
      )}
    </button>
  );
}

interface ModuleItemProps {
  module: Module;
  isExpanded: boolean;
  onToggle: () => void;
  onLessonClick: (lesson: Lesson) => void;
  onDeleteClick: () => void;
}

function ModuleItem({
  module,
  isExpanded,
  onToggle,
  onLessonClick,
  onDeleteClick,
}: ModuleItemProps) {
  const moduleStatus = getModuleStatusText(module.status);

  return (
    <div className="group/module overflow-hidden rounded-xl border border-gray-100">
      <div className="relative">
        <button
          className="w-full bg-white p-4 text-left transition-colors hover:bg-gray-50"
          onClick={onToggle}
        >
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-gray-900 text-sm">
                {module.title}
              </h3>
              <div className="mt-1 flex items-center gap-2">
                <span className={`font-medium text-xs ${moduleStatus.color}`}>
                  {moduleStatus.text}
                </span>
                <span className="text-gray-400 text-xs">
                  {module.lessonCount} Lessons
                </span>
              </div>
            </div>
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 shrink-0 text-gray-400" />
            ) : (
              <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
            )}
          </div>
        </button>
        {/* <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteClick();
          }}
          className="absolute top-3 right-12 p-1.5 rounded-md bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 opacity-0 group-hover/module:opacity-100 transition-all duration-200"
          title="Delete thread history"
        >
          <Trash2 className="h-4 w-4" />
        </button> */}
      </div>

      {isExpanded && module.lessons && (
        <div className="bg-white px-4 pt-1 pb-4">
          <div className="ml-2 space-y-3 border-gray-100 border-l-2 pl-4">
            {module.lessons.map((lesson) => (
              <LessonItem
                key={lesson.id}
                lesson={lesson}
                onClick={() => onLessonClick(lesson)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ModuleListProps {
  className?: string;
  course: Course;
  expandedModules: string[];
  onBackToCourses: () => void;
  onToggleModule: (moduleId: string) => void;
  onLessonClick: (courseId: string, moduleId: string, lesson: Lesson) => void;
  onToggleCollapse?: () => void;
  onDeleteThread?: (moduleId: string) => Promise<void>;
}

/**
 * Module list view for selected course
 */
export function ModuleList({
  className = "",
  course,
  expandedModules,
  onBackToCourses,
  onToggleModule,
  onLessonClick,
  onToggleCollapse,
  onDeleteThread,
}: ModuleListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<Module | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (module: Module) => {
    setModuleToDelete(module);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!(moduleToDelete && onDeleteThread)) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDeleteThread(moduleToDelete.id);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setModuleToDelete(null);
    }
  };

  return (
    <div className={`flex h-full flex-col bg-white ${className}`}>
      <PanelHeader onToggleCollapse={onToggleCollapse} />

      <div className="flex-1 overflow-auto px-4 pb-4">
        <div className="mb-4 flex items-center gap-2">
          <Monitor className="h-4 w-4 text-gray-500" />
          <h2 className="font-medium text-gray-700 text-sm">My Courses</h2>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <button
            className="flex items-center gap-1 text-gray-600 transition-colors hover:text-gray-900"
            onClick={onBackToCourses}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="font-medium text-sm">{course.title}</span>
          </button>
          <span className="font-medium text-orange-500 text-sm">
            {course.progress}%
          </span>
        </div>

        <div className="space-y-3">
          {course.modules.map((module) => (
            <ModuleItem
              isExpanded={expandedModules.includes(module.id)}
              key={module.id}
              module={module}
              onDeleteClick={() => handleDeleteClick(module)}
              onLessonClick={(lesson) =>
                onLessonClick(course.id, module.id, lesson)
              }
              onToggle={() => onToggleModule(module.id)}
            />
          ))}
        </div>
      </div>

      <AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Thread History</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all conversation history for
              &quot;{moduleToDelete?.title}&quot;? This will permanently delete
              the thread, all conversations, and messages. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
