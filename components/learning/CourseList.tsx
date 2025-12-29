import { ChevronRight } from "lucide-react";
import type { Course } from "@/types/learning";
import { PanelHeader } from "./PanelHeader";

// Laptop/Monitor icon
function LaptopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M2 20h20" />
      <path d="M7 16v4" />
      <path d="M17 16v4" />
    </svg>
  );
}

interface CourseListProps {
  className?: string;
  courses: Course[];
  onSelectCourse: (course: Course) => void;
  onToggleCollapse?: () => void;
}

/**
 * Course selection list view
 */
export function CourseList({
  className = "",
  courses,
  onSelectCourse,
  onToggleCollapse,
}: CourseListProps) {
  return (
    <div className={`flex h-full flex-col bg-white ${className}`}>
      <PanelHeader onToggleCollapse={onToggleCollapse} />

      <div className="flex-1 overflow-auto px-4 pb-4">
        <div className="flex items-center gap-2 mb-4">
          <LaptopIcon className="h-4 w-4 text-gray-500" />
          <h2 className="text-sm font-medium text-gray-700">My Courses</h2>
        </div>

        <div className="space-y-3">
          {courses.map((course) => (
            <button
              key={course.id}
              onClick={() => onSelectCourse(course)}
              className="w-full text-left p-4 border border-gray-100 rounded-xl bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 text-sm truncate">
                    {course.title}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {course.modules.length} Modules
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-orange-500">
                    {course.progress}%
                  </span>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
