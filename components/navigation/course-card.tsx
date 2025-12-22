"use client";

import { BookOpen, ChevronRight, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { CourseWithProgress } from "@/types/course";
import {
  formatDuration,
  getStatusLabel,
  getStatusBadgeColor,
} from "@/lib/course-progress";

interface CourseCardProps {
  course: CourseWithProgress;
  isActive?: boolean;
  onClick?: () => void;
}

export function CourseCard({ course, isActive, onClick }: CourseCardProps) {
  const statusLabel = getStatusLabel(course.status);
  const statusColor = getStatusBadgeColor(course.status);
  const durationText = formatDuration(course.estimatedDuration);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-lg border transition-all text-left",
        "hover:shadow-md",
        isActive
          ? "bg-white border-gray-300 shadow-sm"
          : "bg-gray-50 border-gray-200"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          {/* Course Title */}
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 shrink-0 text-gray-600" />
            <h3 className="font-medium text-sm text-gray-900 line-clamp-1">
              {course.title}
            </h3>
          </div>

          {/* Status and Duration */}
          <div className="flex items-center gap-2 text-xs">
            <span className={cn("font-medium", statusColor)}>
              {statusLabel}
            </span>
            <span className="text-gray-400">|</span>
            <div className="flex items-center gap-1 text-gray-500">
              <Clock className="h-3 w-3" />
              <span>{durationText}</span>
            </div>
          </div>

          {/* Progress Bar (only for in-progress courses) */}
          {course.status === "in_progress" && (
            <div className="pt-1">
              <Progress value={course.progress} className="h-1.5" />
            </div>
          )}
        </div>

        {/* Chevron Icon */}
        <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 mt-1" />
      </div>
    </button>
  );
}
