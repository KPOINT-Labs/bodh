"use client";

import { useState, useCallback } from "react";
import Script from "next/script";
import { Card } from "@/components/ui/card";
import { ResizableContent } from "@/components/layout/resizable-content";
import { LessonHeader } from "@/components/course/LessonHeader";
import { ChatAgent } from "@/components/agent/ChatAgent";
import { ChatInput } from "@/components/chat/ChatInput";
import { KPointVideoPlayer } from "@/components/video/KPointVideoPlayer";
import { BookOpen } from "lucide-react";

// Hooks
import { useKPointPlayer } from "@/hooks/useKPointPlayer";
import { useChatSession } from "@/hooks/useChatSession";

interface Lesson {
  id: string;
  title: string;
  orderIndex: number;
  kpointVideoId?: string | null;
  youtubeVideoId?: string | null;
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
  userId: string;
}

export function ModuleContent({ course, module, userId }: ModuleContentProps) {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [videoStartOffset, setVideoStartOffset] = useState<number | null>(null);

  // KPoint player hook
  const { seekTo, getCurrentTime, isPlayerReady } = useKPointPlayer({
    kpointVideoId: selectedLesson?.kpointVideoId,
  });

  // Chat session hook
  const { chatMessages, isSending, sendMessage } = useChatSession({
    courseId: course.id,
    conversationId,
    selectedLesson,
    lessons: module.lessons,
    getCurrentTime,
  });

  // Handle lesson selection
  const handleLessonSelect = useCallback((lesson: Lesson) => {
    setSelectedLesson(lesson);
  }, []);

  // Handle conversation ready
  const handleConversationReady = useCallback((convId: string) => {
    setConversationId(convId);
  }, []);

  // Handle timestamp link clicks - seek to the specified time in the video
  const handleTimestampClick = useCallback(
    (seconds: number, youtubeVideoId?: string | null) => {
      if (isPlayerReady()) {
        seekTo(seconds);
      } else {
        // Player not ready - find the lesson by youtubeVideoId and select it
        if (youtubeVideoId) {
          const matchingLesson = module.lessons.find(
            (lesson) => lesson.youtubeVideoId === youtubeVideoId
          );
          if (matchingLesson) {
            console.log(`Found matching lesson: ${matchingLesson.title}, selecting with offset ${seconds}s`);
            setVideoStartOffset(seconds);
            setSelectedLesson(matchingLesson);
          } else {
            console.warn(`No lesson found with youtubeVideoId: ${youtubeVideoId}`);
            setVideoStartOffset(seconds);
          }
        } else {
          setVideoStartOffset(seconds);
          console.log(`Player not ready. Stored ${seconds} seconds as start offset.`);
        }
      }
    },
    [module.lessons, isPlayerReady, seekTo]
  );

  // Build active lesson (selected or first)
  const activeLesson = selectedLesson || module.lessons.sort((a, b) => a.orderIndex - b.orderIndex)[0];
  const videoIds = activeLesson?.kpointVideoId ? [activeLesson.kpointVideoId] : [];

  // Layout sections
  const header = (
    <LessonHeader courseTitle={course.title} moduleTitle={module.title} />
  );

  const content = (
    <div className="space-y-6 p-6 pb-3">
      {/* AI Welcome Agent */}
      <ChatAgent
        course={course}
        module={module}
        userId={userId}
        onLessonSelect={handleLessonSelect}
        onConversationReady={handleConversationReady}
        onSendMessage={sendMessage}
        onTimestampClick={handleTimestampClick}
        chatMessages={chatMessages}
        isWaitingForResponse={isSending}
      />

      {/* Module Lessons Overview */}
      {!selectedLesson && module.lessons.length > 1 && (
        <LessonsList
          lessons={module.lessons}
          moduleTitle={module.title}
          onLessonSelect={handleLessonSelect}
        />
      )}
    </div>
  );

  const footer = (
    <ChatInput
      placeholder="Ask me anything about this lesson..."
      onSend={sendMessage}
      isLoading={isSending}
      conversationId={conversationId || undefined}
      courseId={course.id}
      userId={userId}
      videoIds={videoIds}
    />
  );

  const rightPanel = selectedLesson?.kpointVideoId ? (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm">Now Playing</h3>
        <p className="text-xs text-muted-foreground">
          Lesson {selectedLesson.orderIndex + 1}: {selectedLesson.title}
        </p>
      </div>
      <div className="flex-1 p-4">
        <KPointVideoPlayer
          kpointVideoId={selectedLesson.kpointVideoId}
          startOffset={videoStartOffset}
        />
      </div>
    </div>
  ) : null;

  return (
    <>
      <Script
        src="https://assets.zencite.in/orca/media/embed/videofront-vega.js"
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

// Extracted component for lessons list
interface LessonsListProps {
  lessons: Lesson[];
  moduleTitle: string;
  onLessonSelect: (lesson: Lesson) => void;
}

function LessonsList({ lessons, moduleTitle, onLessonSelect }: LessonsListProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-primary" />
        Lessons in {moduleTitle}
      </h3>
      <div className="space-y-3">
        {lessons.map((lesson) => (
          <button
            key={lesson.id}
            onClick={() => onLessonSelect(lesson)}
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
  );
}
