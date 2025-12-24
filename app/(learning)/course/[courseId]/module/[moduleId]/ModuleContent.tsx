"use client";

import { useState } from "react";
import Script from "next/script";
import { Card } from "@/components/ui/card";
import { ResizableContent } from "@/components/layout/resizable-content";
import { LessonHeader } from "@/components/course/LessonHeader";
import { CourseWelcomeAgent } from "@/components/agent/CourseWelcomeAgent";
import { ChatInput } from "@/components/chat/ChatInput";
import { PeerLearningPanel } from "@/components/learning/PeerLearningPanel";
import { KPointVideoPlayer } from "@/components/video/KPointVideoPlayer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";

interface Lesson {
  id: string;
  title: string;
  orderIndex: number;
  kpointVideoId?: string | null;
  description?: string | null;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description?: string | null;
  learningObjectives?: string[];
}

interface ModuleContentProps {
  course: Course;
  module: Module;
}

export function ModuleContent({ course, module }: ModuleContentProps) {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const handleLessonSelect = (lesson: Lesson) => {
    setSelectedLesson(lesson);
  };

  const handleBackToWelcome = () => {
    setSelectedLesson(null);
  };

  const header = (
    <LessonHeader
      courseTitle={course.title}
      lessonObjective={selectedLesson ? selectedLesson.title : module.title}
    />
  );

  const content = (
    <div className="space-y-6 p-6">
      {/* AI Welcome Agent */}
      <CourseWelcomeAgent
        course={course}
        module={module}
        onLessonSelect={handleLessonSelect}
      />

      {/* Module Lessons Overview */}
      {!selectedLesson && module.lessons.length > 1 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Lessons in {module.title}
          </h3>
          <div className="space-y-3">
            {module.lessons.map((lesson) => (
              <button
                key={lesson.id}
                onClick={() => handleLessonSelect(lesson)}
                className="w-full text-left p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Lesson {lesson.orderIndex + 1}
                    </span>
                    <h4 className="font-medium">{lesson.title}</h4>
                    {lesson.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {lesson.description}
                      </p>
                    )}
                  </div>
                  <div className="text-primary">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Selected Lesson Info */}
      {/* {selectedLesson && (
        <Card className="p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToWelcome}
              className="gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">
              Now Playing - Lesson {selectedLesson.orderIndex + 1}
            </span>
            <h3 className="text-lg font-semibold">{selectedLesson.title}</h3>
            {selectedLesson.description && (
              <p className="text-sm text-muted-foreground">
                {selectedLesson.description}
              </p>
            )}
          </div>
        </Card>
      )} */}
    </div>
  );

  const footer = <ChatInput placeholder="Ask me anything about this lesson..." />;

  const rightPanel = selectedLesson?.kpointVideoId ? (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm">Now Playing</h3>
        <p className="text-xs text-muted-foreground">
          Lesson {selectedLesson.orderIndex + 1}: {selectedLesson.title}
        </p>
      </div>
      <div className="flex-1 p-4">
        <KPointVideoPlayer kpointVideoId={selectedLesson.kpointVideoId} />
      </div>
    </div>
  ) : (
    <PeerLearningPanel />
  );

  return (
    <>
      <Script
        src="https://assets.kpoint.com/orca/media/embed/videofront-vega.js"
        strategy="afterInteractive"
      />
      <ResizableContent
        header={header}
        content={content}
        footer={footer}
        rightPanel={rightPanel}
      />
    </>
  );
}
