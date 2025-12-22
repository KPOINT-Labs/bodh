"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CircularProgress } from "@/components/ui/circular-progress";
import { LessonTimelineItem } from "./lesson-timeline-item";
import { CourseWithProgress, ModuleWithLessons } from "@/types/course";
import { Skeleton } from "@/components/ui/skeleton";
import { getCourseModules } from "@/actions/enrollment";

interface CourseDetailViewProps {
  course: CourseWithProgress;
  onBack: () => void;
}

export function CourseDetailView({
  course,
  onBack,
}: CourseDetailViewProps) {
  const [modules, setModules] = useState<ModuleWithLessons[]>([]);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourseDetails();
  }, [course.id]);

  const loadCourseDetails = async () => {
    setLoading(true);
    try {
      const data = await getCourseModules(course.id);
      setModules(data);

      // Auto-expand first module if it has in-progress lessons
      if (data.length > 0) {
        const firstModuleWithProgress = data.find((module) =>
          module.lessons.some((lesson) => lesson.progress?.status === "in_progress")
        );
        if (firstModuleWithProgress) {
          setExpandedModules(new Set([firstModuleWithProgress.id]));
        }
      }
    } catch (error) {
      console.error("Error loading course details:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-2 px-2"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="text-sm font-medium">{course.title}</span>
        </Button>

        <CircularProgress value={course.progress} />
      </div>

      {/* Modules list */}
      <div className="space-y-4">
        {loading ? (
          <>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        ) : modules.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No modules available yet</p>
          </div>
        ) : (
          modules.map((module) => {
            const isExpanded = expandedModules.has(module.id);
            const completedLessons = module.lessons.filter(
              (lesson) => lesson.progress?.status === "completed"
            ).length;
            const totalLessons = module.lessons.length;
            const moduleStatus =
              completedLessons === 0
                ? "Yet to start"
                : completedLessons === totalLessons
                ? "Completed"
                : "In Progress";

            const statusColor =
              moduleStatus === "Completed"
                ? "text-green-600"
                : moduleStatus === "In Progress"
                ? "text-yellow-600"
                : "text-gray-600";

            return (
              <div key={module.id} className="border rounded-lg overflow-hidden">
                {/* Module header */}
                <button
                  onClick={() => toggleModule(module.id)}
                  className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-gray-600 shrink-0" />
                        <h4 className="font-medium text-sm text-gray-900">
                          {module.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={statusColor}>{moduleStatus}</span>
                        <span className="text-gray-400">|</span>
                        <span className="text-gray-600">
                          {totalLessons} {totalLessons === 1 ? "Lesson" : "Lessons"}
                        </span>
                      </div>
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                    )}
                  </div>
                </button>

                {/* Module lessons */}
                {isExpanded && (
                  <div className="p-4 bg-white space-y-4">
                    {module.lessons.map((lesson, index) => (
                      <LessonTimelineItem
                        key={lesson.id}
                        lesson={lesson}
                        courseSlug={course.slug}
                        isFirst={index === 0}
                        isLast={index === module.lessons.length - 1}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
