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

  // KPoint player hook with FA trigger integration
  const { seekTo, getCurrentTime, isPlayerReady, isPlaying } = useKPointPlayer({
    kpointVideoId: selectedLesson?.kpointVideoId,
    onFATrigger: async (message: string, timestampSeconds: number, pauseVideo?: boolean) => {
      // Send FA message directly without showing user message in UI, with specific timestamp
      await sendFAMessage(message, timestampSeconds);
      // Video is already paused by the hook when pauseVideo is true
    },
  });

  // Chat session hook
  const { chatMessages, isSending, sendMessage, sendFAMessage } = useChatSession({
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
      // Find the matching lesson by youtubeVideoId
      const matchingLesson = youtubeVideoId
        ? module.lessons.find((lesson) => lesson.youtubeVideoId === youtubeVideoId)
        : null;

      // Check if this lesson is already selected (avoid re-render)
      const isAlreadySelected = matchingLesson && selectedLesson?.id === matchingLesson.id;

      if (isAlreadySelected) {
        // Same lesson already selected - just seek, don't re-render
        seekTo(seconds);
        console.log(`Same lesson already playing. Seeking to ${seconds}s`);
      } else if (matchingLesson) {
        // Different lesson - select it with offset
        console.log(`Found matching lesson: ${matchingLesson.title}, selecting with offset ${seconds}s`);
        setVideoStartOffset(seconds);
        setSelectedLesson(matchingLesson);
      } else if (isPlayerReady()) {
        // No matching lesson but player is ready - seek current video
        seekTo(seconds);
      } else if (youtubeVideoId) {
        console.warn(`No lesson found with youtubeVideoId: ${youtubeVideoId}`);
        setVideoStartOffset(seconds);
      } else {
        setVideoStartOffset(seconds);
        console.log(`Player not ready. Stored ${seconds} seconds as start offset.`);
      }
    },
    [module.lessons, selectedLesson?.id, isPlayerReady, seekTo]
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
    <div className="h-full flex flex-col bg-white p-4">
      {/* Video Card */}
      <div className="bg-background rounded-2xl shadow-xl overflow-hidden border-2 border-blue-200 hover:border-blue-400 hover:shadow-blue-300/40">
        {/* Video Player */}
        <div className="aspect-video">
          <KPointVideoPlayer
            kpointVideoId={selectedLesson.kpointVideoId}
            startOffset={videoStartOffset}
          />
        </div>
        {/* Lesson Title Below Video */}
        <div className="p-3">
          <h3 className="font-medium text-xs text-foreground line-clamp-2">
            Lesson {selectedLesson.orderIndex + 1}: {selectedLesson.title}
          </h3>
        </div>
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
