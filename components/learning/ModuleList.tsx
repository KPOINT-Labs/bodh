import { ChevronLeft, ChevronDown, ChevronRight, Monitor, FileText } from "lucide-react";
import type { Course, Module, Lesson } from "@/types/learning";
import {
  getStatusColor,
  getStatusText,
  getStatusTextColor,
  getModuleStatusText,
} from "@/lib/learning/status";
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
      onClick={onClick}
      className="w-full flex items-center gap-3 py-1 hover:bg-gray-50 rounded transition-colors group"
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
}

function ModuleItem({ module, isExpanded, onToggle, onLessonClick }: ModuleItemProps) {
  const moduleStatus = getModuleStatusText(module.status);

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
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
}: ModuleListProps) {
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
            />
          ))}
        </div>
      </div>
    </div>
  );
}
