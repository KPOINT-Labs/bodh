"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Script from "next/script";
import { Card } from "@/components/ui/card";
import { ResizableContent } from "@/components/layout/resizable-content";
import { LessonHeader } from "@/components/course/LessonHeader";
import { ChatAgent } from "@/components/agent/ChatAgent";
import { ChatInput } from "@/components/chat/ChatInput";
import { KPointVideoPlayer } from "@/components/video/KPointVideoPlayer";
import { BookOpen } from "lucide-react";
import { type MessageData } from "@/lib/chat/message-store";

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

// Type for KPoint player instance
interface KPointPlayer {
  getCurrentTime: () => number;
}

export function ModuleContent({ course, module, userId }: ModuleContentProps) {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<MessageData[]>([]);
  const [isSending, setIsSending] = useState(false);
  const kpointPlayerRef = useRef<KPointPlayer | null>(null);

  // Get the first lesson for fallback
  const firstLesson = module.lessons.sort((a, b) => a.orderIndex - b.orderIndex)[0];

  // Listen for KPoint player ready event
  useEffect(() => {
    const handlePlayerReady = (event: CustomEvent<{ message: string; container: unknown; player: KPointPlayer }>) => {
      console.log("KPoint player ready:", event.detail.message);
      kpointPlayerRef.current = event.detail.player;
    };

    document.addEventListener("kpointPlayerReady", handlePlayerReady as EventListener);

    return () => {
      document.removeEventListener("kpointPlayerReady", handlePlayerReady as EventListener);
    };
  }, []);

  const handleLessonSelect = (lesson: Lesson) => {
    setSelectedLesson(lesson);
  };

  const handleConversationReady = useCallback((convId: string) => {
    setConversationId(convId);
  }, []);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!conversationId) {
      console.error("Conversation not ready");
      return;
    }

    // Immediately show user message with a temporary ID
    const tempUserMessage: MessageData = {
      id: `temp-${Date.now()}`,
      conversationId,
      role: "user",
      content: message,
      inputType: "text",
      messageType: "general",
      createdAt: new Date().toISOString(),
    };

    // Add user message immediately to show it right away
    setChatMessages(prev => [...prev, tempUserMessage]);
    setIsSending(true);

    try {
      // Build video IDs array - use selected lesson or fallback to first lesson
      const videoIds: string[] = [];
      const activeLesson = selectedLesson || firstLesson;
      if (activeLesson?.youtubeVideoId) {
        videoIds.push(activeLesson.youtubeVideoId);
      }

      console.log("Active lesson:", activeLesson?.title, "YouTube ID:", activeLesson?.youtubeVideoId);

      // Get current video timestamp from KPoint player (with safety check)
      let startTimestamp = 0;
      if (kpointPlayerRef.current) {
        try {
          const currentTime = kpointPlayerRef.current.getCurrentTime();
          if (typeof currentTime === "number" && !isNaN(currentTime)) {
            startTimestamp = Math.floor(currentTime); // Convert to integer seconds
          }
        } catch (error) {
          console.warn("Failed to get current time from KPoint player:", error);
        }
      }

      console.log("Sending message - videoIds:", videoIds, "startTimestamp:", startTimestamp);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          conversationId,
          courseId: course.id,
          videoIds,
          startTimestamp,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Add assistant message
        setChatMessages(prev => [...prev, data.assistantMessage]);
      } else {
        console.error("Chat error:", data.error);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  }, [conversationId, course.id, selectedLesson, firstLesson]);

  const header = (
    <LessonHeader
      courseTitle={course.title}
      moduleTitle={module.title}
    />
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
        chatMessages={chatMessages}
        isWaitingForResponse={isSending}
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

  const footer = (
    <ChatInput
      placeholder="Ask me anything about this lesson..."
      onSend={handleSendMessage}
      isLoading={isSending}
      conversationId={conversationId || undefined}
      courseId={course.id}
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
        <KPointVideoPlayer kpointVideoId={selectedLesson.kpointVideoId} />
      </div>
    </div>
  ) : null;

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
