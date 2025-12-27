"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronDown, ChevronRight } from "lucide-react";

interface Lesson {
  id: string;
  title: string;
  status: "completed" | "seen" | "attempted" | "in_progress" | "not_started";
}

interface Module {
  id: string;
  title: string;
  status: "completed" | "in_progress" | "yet_to_start";
  lessonCount: number;
  lessons?: Lesson[];
}

interface Course {
  id: string;
  title: string;
  progress: number;
  modules: Module[];
}

// Mock data - replace with actual data from props or API
const mockCourse: Course = {
  id: "1",
  title: "Computational Thinking",
  progress: 50,
  modules: [
    {
      id: "m1",
      title: "Datasets",
      status: "completed",
      lessonCount: 5,
      lessons: [
        { id: "l1", title: "Lecture 1", status: "completed" },
        { id: "l2", title: "Lecture 2", status: "completed" },
        { id: "l3", title: "Lecture 3", status: "completed" },
        { id: "l4", title: "Lecture 4", status: "completed" },
        { id: "l5", title: "Lecture 5", status: "completed" },
      ],
    },
    {
      id: "m2",
      title: "Systematic Data Processing",
      status: "in_progress",
      lessonCount: 6,
      lessons: [
        { id: "l6", title: "Lecture 1", status: "completed" },
        { id: "l7", title: "Lecture 2", status: "completed" },
        { id: "l8", title: "Flashcards", status: "seen" },
        { id: "l9", title: "Quiz", status: "attempted" },
        { id: "l10", title: "Lecture 3", status: "in_progress" },
        { id: "l11", title: "Lecture 4", status: "not_started" },
      ],
    },
    {
      id: "m3",
      title: "Flowcharts",
      status: "yet_to_start",
      lessonCount: 4,
      lessons: [
        { id: "l12", title: "Lecture 1", status: "not_started" },
        { id: "l13", title: "Lecture 2", status: "not_started" },
        { id: "l14", title: "Lecture 3", status: "not_started" },
        { id: "l15", title: "Lecture 4", status: "not_started" },
      ],
    },
  ],
};

interface PeerLearningPanelProps {
  className?: string;
  course?: Course;
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
  course = mockCourse
}: PeerLearningPanelProps) {
  const [expandedModules, setExpandedModules] = useState<string[]>(["m2"]); // Default expand in-progress module

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

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
        <button className="p-2.5 border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors">
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
          <button className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors">
            <ChevronLeft className="h-4 w-4" />
            <span className="text-sm font-medium">{course.title}</span>
          </button>
          <span className="text-sm font-medium text-orange-500">{course.progress}%</span>
        </div>

        {/* Modules List */}
        <div className="space-y-3">
          {course.modules.map((module) => {
            const isExpanded = expandedModules.includes(module.id);
            const moduleStatus = getModuleStatusText(module.status);

            return (
              <div key={module.id} className="border border-gray-100 rounded-xl overflow-hidden">
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
                            className="w-full flex items-center gap-3 py-1 hover:bg-gray-50 rounded transition-colors group"
                          >
                            <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(lesson.status)} shrink-0`} />
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
