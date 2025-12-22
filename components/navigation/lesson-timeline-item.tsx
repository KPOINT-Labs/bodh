"use client";

import Link from "next/link";
import { LessonWithProgress } from "@/types/course";
import { getLessonStatusInfo } from "@/lib/course-progress";
import { cn } from "@/lib/utils";

interface LessonTimelineItemProps {
  lesson: LessonWithProgress;
  courseSlug: string;
  isFirst?: boolean;
  isLast?: boolean;
}

export function LessonTimelineItem({
  lesson,
  courseSlug,
  isFirst,
  isLast,
}: LessonTimelineItemProps) {
  const statusInfo = getLessonStatusInfo(lesson.progress, lesson.type);

  return (
    <div className="relative flex items-start gap-3">
      {/* Timeline connector */}
      {!isLast && (
        <div className="absolute left-[7px] top-[14px] bottom-[-16px] w-[2px] bg-gradient-to-b from-purple-300 via-pink-200 to-gray-200" />
      )}

      {/* Status dot */}
      <div
        className={cn(
          "relative z-10 w-3.5 h-3.5 rounded-full shadow-sm shrink-0 mt-0.5",
          statusInfo.color
        )}
      />

      {/* Lesson content */}
      <Link
        href={`/course/${courseSlug}/lesson/${lesson.slug}`}
        className="flex-1 group"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-gray-900 group-hover:text-blue-600 transition-colors">
            {lesson.title}
          </span>
          <span className={cn("text-[11px] font-medium", statusInfo.textColor)}>
            {statusInfo.label}
          </span>
        </div>
      </Link>
    </div>
  );
}
