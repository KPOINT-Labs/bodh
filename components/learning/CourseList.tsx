"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown, Clock, Layers, BookAIcon, CirclePlay } from "lucide-react";
import type { Course, CourseStatus, Module, Lesson } from "@/types/learning";
import { PanelHeader } from "./PanelHeader";
import { ProfileActions } from "@/components/profile-actions";
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

interface CourseListProps {
  className?: string;
  courses: Course[];
  selectedCourse: Course | null;
  expandedModules: string[];
  activeModuleId?: string;
  activeLessonId?: string;
  onSelectCourse: (course: Course) => void;
  onToggleModule: (moduleId: string) => void;
  onLessonClick: (courseId: string, moduleId: string, lesson: Lesson) => void;
  onToggleCollapse?: () => void;
  onDeleteThread?: (moduleId: string) => Promise<void>;
}

/**
 * Get status display text and color based on course status
 */
function getStatusDisplay(status: CourseStatus): { text: string; colorClass: string } {
  switch (status) {
    case "in_progress":
      return { text: "In Progress", colorClass: "text-orange-500" };
    case "completed":
      return { text: "Completed", colorClass: "text-green-500" };
    case "yet_to_start":
    default:
      return { text: "Yet to start", colorClass: "text-gray-400" };
  }
}

/**
 * Format duration in minutes to display string
 */
function formatDuration(minutes?: number): string {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Lesson item within an expanded module
 */
function LessonItem({
  lesson,
  isActive,
  onClick,
}: {
  lesson: Lesson;
  isActive: boolean;
  onClick: () => void;
}) {
  const isCompleted = lesson.status === "completed";
  const isInProgress = lesson.status === "in_progress" || lesson.status === "seen";

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 py-2.5 pl-8 pr-2 rounded-lg transition-colors group cursor-pointer ${
        isActive
          ? "bg-purple-200 hover:bg-purple-300"
          : "hover:bg-gray-100"
      }`}
    >
      {/* Status circle */}
      <div
        className={`
          w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center
          ${isCompleted ? "bg-purple-500 border-purple-500" : ""}
          ${isInProgress ? "border-orange-400 bg-white" : ""}
          ${!isCompleted && !isInProgress ? "border-gray-300" : ""}
        `}
      >
        {isCompleted && (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
        {isInProgress && (
          <div className="w-2 h-2 rounded-full bg-orange-400" />
        )}
      </div>

      {/* Video icon in circle */}
      <div className="w-5 h-5 rounded-full border-2 border-gray-700 bg-gray-100 flex items-center justify-center shrink-0">
        <CirclePlay className="w-3 h-3 text-gray-600" />
      </div>

      {/* Lesson title */}
      <span className="text-sm text-gray-800 flex-1 text-left group-hover:text-gray-900 truncate">
        {lesson.title}
      </span>

      {/* In Progress badge */}
      {isInProgress && (
        <span className="text-[11px] text-orange-500 font-medium bg-orange-50 px-2 py-0.5 rounded">
          In Progress
        </span>
      )}
    </button>
  );
}

/**
 * Module item - shown below expanded course
 */
function ModuleItem({
  module,
  isExpanded,
  isActive,
  activeLessonId,
  onToggle,
  onLessonClick,
  onDeleteClick,
}: {
  module: Module;
  isExpanded: boolean;
  isActive: boolean;
  activeLessonId?: string;
  onToggle: () => void;
  onLessonClick: (lesson: Lesson) => void;
  onDeleteClick?: () => void;
}) {
  const completedCount = module.lessons.filter((l) => l.status === "completed").length;

  return (
    <div
      className={`group/module rounded-lg transition-colors ${
        isActive ? "bg-purple-100 border-l-4 border-purple-500" : ""
      }`}
    >
      {/* Module header */}
      <div className="relative flex items-center">
        <button
          onClick={onToggle}
          className={`w-full flex items-center gap-3 py-3 px-1 rounded-lg transition-colors cursor-pointer ${
            isActive ? "hover:bg-purple-200" : "hover:bg-gray-100"
          }`}
        >
          {/* Chevron */}
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
          )}

          {/* Purple stacked layers icon */}
          <Layers className="h-5 w-5 text-purple-500 shrink-0" />

          {/* Module title */}
          <span className="flex-1 text-sm font-medium text-gray-900 text-left">
            {module.title}
          </span>

          {/* Progress count */}
          <span className="text-sm text-gray-400 shrink-0 pr-8">
            {completedCount}/{module.lessonCount}
          </span>
        </button>
        {/* {onDeleteClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClick();
            }}
            className="absolute right-1 p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 opacity-0 group-hover/module:opacity-100 transition-all duration-200"
            title="Delete thread history"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )} */}
      </div>

      {/* Lessons - shown when module is expanded */}
      {isExpanded && module.lessons && module.lessons.length > 0 && (
        <div className="space-y-0.5">
          {module.lessons.map((lesson) => (
            <LessonItem
              key={lesson.id}
              lesson={lesson}
              isActive={lesson.id === activeLessonId}
              onClick={() => onLessonClick(lesson)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Course card with expansion capability
 */
function CourseCard({
  course,
  isSelected,
  onSelect,
}: {
  course: Course;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const statusDisplay = getStatusDisplay(course.status);
  const duration = formatDuration(course.totalDuration);
  const isActive = course.status === "in_progress";

  return (
    <button
      onClick={onSelect}
      className={`
        w-full text-left p-4 rounded-2xl border
        transition-all duration-200
        ${isActive ? "bg-purple-100/70 border-purple-100" : "bg-white border-gray-100"}
        ${isSelected ? "shadow-md" : "shadow-sm hover:shadow-md"}
      `}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 text-base leading-tight flex-1 min-w-0">
          {course.title}
        </h3>
        {isSelected ? (
          <ChevronDown className="h-5 w-5 text-gray-400 shrink-0 ml-2" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-400 shrink-0 ml-2" />
        )}
      </div>

      {/* Status and Duration */}
      <div className="flex items-center gap-2 mt-2">
        <span className={`text-sm ${statusDisplay.colorClass}`}>
          {statusDisplay.text}
        </span>
        {duration && (
          <>
            <Clock className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-sm text-gray-400">{duration}</span>
          </>
        )}
      </div>
    </button>
  );
}

/**
 * Course list with accordion expansion for modules
 */
export function CourseList({
  className = "",
  courses,
  selectedCourse,
  expandedModules,
  activeModuleId,
  activeLessonId,
  onSelectCourse,
  onToggleModule,
  onLessonClick,
  onToggleCollapse,
  onDeleteThread,
}: CourseListProps) {
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
        {/* MY COURSES Header */}
        <div className="flex items-center gap-2 pt-2 pb-4">
          <BookAIcon className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 uppercase tracking-wide">
            MY COURSES
          </span>
        </div>

        {/* Course Cards with Modules */}
        <div className="space-y-3">
          {courses.map((course) => {
            const isSelected = selectedCourse?.id === course.id;

            return (
              <div key={course.id}>
                {/* Course Card */}
                <CourseCard
                  course={course}
                  isSelected={isSelected}
                  onSelect={() => onSelectCourse(course)}
                />

                {/* Modules - shown OUTSIDE the card when course is selected */}
                {isSelected && (
                  <div className="mt-3 space-y-1">
                    {course.modules.map((module) => (
                      <ModuleItem
                        key={module.id}
                        module={module}
                        isExpanded={expandedModules.includes(module.id)}
                        isActive={module.id === activeModuleId}
                        activeLessonId={activeLessonId}
                        onToggle={() => onToggleModule(module.id)}
                        onLessonClick={(lesson) => onLessonClick(course.id, module.id, lesson)}
                        onDeleteClick={onDeleteThread ? () => handleDeleteClick(module) : undefined}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer with Profile and Logout */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <ProfileActions className="w-full" linkClassName="text-sm" logoutVariant="text" />
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
