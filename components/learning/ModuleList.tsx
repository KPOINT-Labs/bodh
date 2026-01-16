"use client";

import { useState } from "react";
import { ChevronLeft, ChevronDown, ChevronRight, Monitor, FileText, Trash2 } from "lucide-react";
import type { Course, Module, Lesson } from "@/types/learning";
import {
  getStatusColor,
  getStatusText,
  getStatusTextColor,
  getModuleStatusText,
} from "@/lib/learning/status";
import { PanelHeader } from "./PanelHeader";
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

interface LessonItemProps {
  lesson: Lesson;
  onClick: () => void;
}

function LessonItem({ lesson, onClick }: LessonItemProps) {
  const statusText = getStatusText(lesson.status);
  const statusTextColor = getStatusTextColor(lesson.status);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 py-1 hover:bg-gray-50 rounded transition-colors group"
    >
      <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(lesson.status)} shrink-0`} />
      <span className="text-sm text-gray-700 flex-1 text-left group-hover:text-gray-900">
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

function ModuleItem({ module, isExpanded, onToggle, onLessonClick, onDeleteClick }: ModuleItemProps) {
  const moduleStatus = getModuleStatusText(module.status);

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden group/module">
      <div className="relative">
        <button
          onClick={onToggle}
          className="w-full text-left p-4 bg-white hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 text-sm">{module.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-medium ${moduleStatus.color}`}>
                  {moduleStatus.text}
                </span>
                <span className="text-xs text-gray-400">
                  {module.lessonCount} Lessons
                </span>
              </div>
            </div>
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-gray-400 shrink-0" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />
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
        <div className="px-4 pb-4 pt-1 bg-white">
          <div className="ml-2 border-l-2 border-gray-100 pl-4 space-y-3">
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
    if (!moduleToDelete || !onDeleteThread) return;

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
        <div className="flex items-center gap-2 mb-4">
          <Monitor className="h-4 w-4 text-gray-500" />
          <h2 className="text-sm font-medium text-gray-700">My Courses</h2>
        </div>

        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBackToCourses}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="text-sm font-medium">{course.title}</span>
          </button>
          <span className="text-sm font-medium text-orange-500">
            {course.progress}%
          </span>
        </div>

        <div className="space-y-3">
          {course.modules.map((module) => (
            <ModuleItem
              key={module.id}
              module={module}
              isExpanded={expandedModules.includes(module.id)}
              onToggle={() => onToggleModule(module.id)}
              onLessonClick={(lesson) => onLessonClick(course.id, module.id, lesson)}
              onDeleteClick={() => handleDeleteClick(module)}
            />
          ))}
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Thread History</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all conversation history for &quot;{moduleToDelete?.title}&quot;?
              This will permanently delete the thread, all conversations, and messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
