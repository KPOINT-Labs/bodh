"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronDown, ChevronRight, Loader2 } from "lucide-react";

interface Lesson {
  id: string;
  title: string;
  type: string;
  status: "completed" | "seen" | "attempted" | "in_progress" | "not_started";
}

interface Module {
  id: string;
  title: string;
  status: "completed" | "in_progress" | "yet_to_start";
  lessonCount: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  slug?: string | null;
  progress: number;
  modules: Module[];
}

interface PeerLearningPanelProps {
  className?: string;
  userId?: string;
  activeCourseId?: string;
  activeModuleId?: string;
  activeLessonId?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

function getStatusColor(status: Lesson["status"]) {
  switch (status) {
    case "completed":
      return "bg-green-500";
    case "seen":
      return "bg-blue-400";
    case "attempted":
      return "bg-blue-500";
    case "in_progress":
      return "bg-yellow-500";
    case "not_started":
      return "bg-gray-300";
    default:
      return "bg-gray-300";
  }
}

function getStatusText(status: Lesson["status"]) {
  switch (status) {
    case "completed":
      return "Completed";
    case "seen":
      return "Seen";
    case "attempted":
      return "Attempted";
    case "in_progress":
      return "In Progress";
    case "not_started":
      return "";
    default:
      return "";
  }
}

function getStatusTextColor(status: Lesson["status"]) {
  switch (status) {
    case "completed":
      return "text-green-500";
    case "seen":
      return "text-blue-400";
    case "attempted":
      return "text-blue-500";
    case "in_progress":
      return "text-yellow-600";
    case "not_started":
      return "text-gray-400";
    default:
      return "text-gray-400";
  }
}

function getModuleStatusText(status: Module["status"]) {
  switch (status) {
    case "completed":
      return { text: "Completed", color: "text-green-500" };
    case "in_progress":
      return { text: "In Progress", color: "text-orange-500" };
    case "yet_to_start":
      return { text: "Yet to start", color: "text-gray-400" };
    default:
      return { text: "", color: "" };
  }
}

// Laptop/Monitor icon component
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

// Menu dots icon
function MenuDotsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="5" width="16" height="3" rx="1" />
      <rect x="4" y="10.5" width="16" height="3" rx="1" />
      <rect x="4" y="16" width="16" height="3" rx="1" />
    </svg>
  );
}

// Module icon (document/file icon)
function ModuleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h8" />
      <path d="M8 11h8" />
      <path d="M8 15h4" />
    </svg>
  );
}

export function PeerLearningPanel({
  className = "",
  userId: propUserId,
  activeCourseId,
  activeModuleId,
  isCollapsed = false,
  onToggleCollapse,
}: PeerLearningPanelProps) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(propUserId || null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  // Fetch current user if userId not provided
  useEffect(() => {
    async function fetchCurrentUser() {
      if (propUserId) {
        setUserId(propUserId);
        return;
      }

      try {
        const response = await fetch("/api/user/current");
        const data = await response.json();

        if (data.success) {
          setUserId(data.user.id);
        } else {
          setError(data.error || "Failed to get user");
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch current user:", err);
        setError("Failed to get user");
        setIsLoading(false);
      }
    }

    fetchCurrentUser();
  }, [propUserId]);

  // Fetch enrolled courses when userId is available
  useEffect(() => {
    async function fetchCourses() {
      if (!userId) return;

      try {
        setIsLoading(true);
        const response = await fetch(`/api/courses/enrolled?userId=${userId}`);
        const data = await response.json();

        if (data.success) {
          setCourses(data.courses);

          // Auto-select course if activeCourseId is provided, otherwise select first course
          if (data.courses.length > 0) {
            const courseToSelect = activeCourseId
              ? data.courses.find((c: Course) => c.id === activeCourseId)
              : data.courses[0];

            if (courseToSelect) {
              setSelectedCourse(courseToSelect);

              // Auto-expand active module or first in-progress module
              const moduleToExpand = activeModuleId
                ? courseToSelect.modules.find((m: Module) => m.id === activeModuleId)
                : courseToSelect.modules.find((m: Module) => m.status === "in_progress");

              if (moduleToExpand) {
                setExpandedModules([moduleToExpand.id]);
              }
            }
          }
        } else {
          setError(data.error || "Failed to load courses");
        }
      } catch (err) {
        console.error("Failed to fetch courses:", err);
        setError("Failed to load courses");
      } finally {
        setIsLoading(false);
      }
    }

    if (userId) {
      fetchCourses();
    }
  }, [userId, activeCourseId, activeModuleId]);

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleBackToCourses = () => {
    setSelectedCourse(null);
  };

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    // Auto-expand first in-progress module
    const inProgressModule = course.modules.find((m) => m.status === "in_progress");
    if (inProgressModule) {
      setExpandedModules([inProgressModule.id]);
    } else {
      setExpandedModules([]);
    }
  };

  const handleLessonClick = (courseId: string, moduleId: string) => {
    // Find the course to get its slug
    const course = courses.find((c) => c.id === courseId);
    const courseSlug = course?.slug || courseId;
    router.push(`/course/${courseSlug}/module/${moduleId}`);
  };

  // const handleModuleClick = (courseId: string, moduleId: string) => {
  //   const course = courses.find((c) => c.id === courseId);
  //   const courseSlug = course?.slug || courseId;
  //   router.push(`/course/${courseSlug}/module/${moduleId}`);
  // };

  // Collapsed view
  if (isCollapsed) {
    return (
      <div className={`flex h-full flex-col bg-white items-center py-4 ${className}`}>
        <button
          onClick={onToggleCollapse}
          className="p-3 hover:bg-gray-100 rounded-lg transition-colors mb-2"
          title="New Course"
        >
          <Plus className="h-5 w-5 text-gray-600" />
        </button>
        <button
          onClick={onToggleCollapse}
          className="p-3 hover:bg-gray-100 rounded-lg transition-colors"
          title="My Courses"
        >
          <LaptopIcon className="h-5 w-5 text-gray-600" />
        </button>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex h-full flex-col bg-white items-center justify-center ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">Loading courses...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`flex h-full flex-col bg-white items-center justify-center p-4 ${className}`}>
        <p className="text-sm text-red-500 text-center">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  // Empty state - no courses enrolled
  if (courses.length === 0) {
    return (
      <div className={`flex h-full flex-col bg-white ${className}`}>
        {/* Header with New Course button */}
        <div className="p-4 flex items-center gap-3">
          <Button
            variant="outline"
            className="flex-1 gap-2 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 rounded-lg px-4 py-2 h-10 text-sm font-medium justify-center"
          >
            <Plus className="h-4 w-4" />
            New Course
          </Button>
          <button
            onClick={onToggleCollapse}
            className="p-2.5 border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
            title="Collapse panel"
          >
            <MenuDotsIcon className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <LaptopIcon className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500 text-center">No courses enrolled yet</p>
          <p className="text-xs text-gray-400 text-center mt-1">
            Enroll in a course to start learning
          </p>
        </div>
      </div>
    );
  }

  // Course list view (when no course is selected)
  if (!selectedCourse) {
    return (
      <div className={`flex h-full flex-col bg-white ${className}`}>
        {/* Header with New Course button */}
        <div className="p-4 flex items-center gap-3">
          <Button
            variant="outline"
            className="flex-1 gap-2 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 rounded-lg px-4 py-2 h-10 text-sm font-medium justify-center"
          >
            <Plus className="h-4 w-4" />
            New Course
          </Button>
          <button
            onClick={onToggleCollapse}
            className="p-2.5 border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
            title="Collapse panel"
          >
            <MenuDotsIcon className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* My Courses Section */}
        <div className="flex-1 overflow-auto px-4 pb-4">
          <div className="flex items-center gap-2 mb-4">
            <LaptopIcon className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-medium text-gray-700">My Courses</h2>
          </div>

          {/* Course List */}
          <div className="space-y-3">
            {courses.map((course) => (
              <button
                key={course.id}
                onClick={() => handleSelectCourse(course)}
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

  // Selected course view with modules
  return (
    <div className={`flex h-full flex-col bg-white ${className}`}>
      {/* Header with New Course button */}
      <div className="p-4 flex items-center gap-3">
        <Button
          variant="outline"
          className="flex-1 gap-2 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 rounded-lg px-4 py-2 h-10 text-sm font-medium justify-center"
        >
          <Plus className="h-4 w-4" />
          New Course
        </Button>
        <button
          onClick={onToggleCollapse}
          className="p-2.5 border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
          title="Collapse panel"
        >
          <MenuDotsIcon className="h-5 w-5 text-gray-400" />
        </button>
      </div>

      {/* My Courses Section */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        <div className="flex items-center gap-2 mb-4">
          <LaptopIcon className="h-4 w-4 text-gray-500" />
          <h2 className="text-sm font-medium text-gray-700">My Courses</h2>
        </div>

        {/* Course Header with Back Button */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleBackToCourses}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="text-sm font-medium">{selectedCourse.title}</span>
          </button>
          <span className="text-sm font-medium text-orange-500">
            {selectedCourse.progress}%
          </span>
        </div>

        {/* Modules List */}
        <div className="space-y-3">
          {selectedCourse.modules.map((module) => {
            const isExpanded = expandedModules.includes(module.id);
            const moduleStatus = getModuleStatusText(module.status);

            return (
              <div
                key={module.id}
                className="border border-gray-100 rounded-xl overflow-hidden"
              >
                {/* Module Header */}
                <button
                  onClick={() => toggleModule(module.id)}
                  className="w-full text-left p-4 bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <ModuleIcon className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm">
                        {module.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-xs font-medium ${moduleStatus.color}`}
                        >
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

                {/* Lessons List (Expanded) */}
                {isExpanded && module.lessons && (
                  <div className="px-4 pb-4 pt-1 bg-white">
                    <div className="ml-2 border-l-2 border-gray-100 pl-4 space-y-3">
                      {module.lessons.map((lesson) => {
                        const statusText = getStatusText(lesson.status);
                        const statusTextColor = getStatusTextColor(lesson.status);

                        return (
                          <button
                            key={lesson.id}
                            onClick={() =>
                              handleLessonClick(
                                selectedCourse.id,
                                module.id
                              )
                            }
                            className="w-full flex items-center gap-3 py-1 hover:bg-gray-50 rounded transition-colors group"
                          >
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${getStatusColor(lesson.status)} shrink-0`}
                            />
                            <span className="text-sm text-gray-700 flex-1 text-left group-hover:text-gray-900">
                              {lesson.title}
                            </span>
                            {statusText && (
                              <span className={`text-xs ${statusTextColor}`}>
                                {statusText}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Go to Module button */}
                    {/* <button
                      onClick={() =>
                        handleModuleClick(selectedCourse.id, module.id)
                      }
                      className="mt-3 ml-6 text-xs text-blue-500 hover:text-blue-600 font-medium"
                    >
                      Open Module →
                    </button> */}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
