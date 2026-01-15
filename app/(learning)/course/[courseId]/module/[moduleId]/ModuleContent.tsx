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
import { toast } from "sonner";

// Hooks
import { useKPointPlayer } from "@/hooks/useKPointPlayer";
import { useChatSession } from "@/hooks/useChatSession";
import { useLiveKit, TranscriptSegment } from "@/hooks/useLiveKit";
import { useSessionType } from "@/hooks/useSessionType";

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
  initialLessonId?: string;
}

export function ModuleContent({ course, module, userId, initialLessonId }: ModuleContentProps) {
  // Find initial lesson from URL parameter or default to null (will show first lesson)
  const getInitialLesson = (): Lesson | null => {
    if (initialLessonId) {
      const lesson = module.lessons.find((l) => l.id === initialLessonId);
      return lesson || null;
    }
    return null;
  };

  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(getInitialLesson);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [videoStartOffset, setVideoStartOffset] = useState<number | null>(null);

  // Get active lesson (selected or first)
  const activeLesson = selectedLesson || module.lessons.sort((a, b) => a.orderIndex - b.orderIndex)[0];
  // Use youtubeVideoId for Sarvam AI (video context), kpointVideoId for player
  const videoIds = activeLesson?.youtubeVideoId ? [activeLesson.youtubeVideoId] : [];

  // Determine session type (welcome vs welcome_back) before connecting to LiveKit
  const { sessionType, isLoading: isSessionTypeLoading, isReturningUser } = useSessionType({
    userId,
    moduleId: module.id,
  });

  // Track which transcript segments have been stored to avoid duplicates
  const storedSegmentsRef = useRef<Set<string>>(new Set());
  // Track if user has sent a message - used for storing subsequent agent responses
  const userHasSentMessageRef = useRef<boolean>(false);
  // Track if welcome message has been stored (for first-time users only)
  const welcomeStoredRef = useRef<boolean>(false);
  // Ref for isReturningUser to use in callback
  const isReturningUserRef = useRef<boolean>(isReturningUser);
  // Ref for addAssistantMessage to use in callback (set after useChatSession)
  const addAssistantMessageRef = useRef<((message: string, messageType?: string) => Promise<void>) | null>(null);
  // Ref for clearAgentTranscript to use in callback (set after useLiveKit)
  const clearAgentTranscriptRef = useRef<(() => void) | null>(null);
  // Ref for handleAddUserMessage to use in onUserMessage callback (set after useChatSession)
  const handleAddUserMessageRef = useRef<((message: string, messageType?: string, inputType?: string) => Promise<void>) | null>(null);

  // Keep isReturningUserRef updated
  useEffect(() => {
    isReturningUserRef.current = isReturningUser;
  }, [isReturningUser]);

  // Handle LiveKit agent transcript - store in DB and add to chat when final
  // Welcome message: Store for first-time users, skip for returning users
  // Other agent responses: Store after user sends a message
  const handleTranscriptCallback = useCallback(
    (segment: TranscriptSegment) => {
      // Debug logging
      console.log("[ModuleContent] Transcript callback:", {
        isFinal: segment.isFinal,
        isAgent: segment.isAgent,
        textLength: segment.text?.length,
        userHasSent: userHasSentMessageRef.current,
        welcomeStored: welcomeStoredRef.current,
        isReturning: isReturningUserRef.current,
        hasAddAssistant: !!addAssistantMessageRef.current,
      });

      if (!segment.isFinal || !segment.isAgent || !segment.text.trim()) {
        return;
      }

      const segmentKey = `${segment.id}-${segment.text.length}`;
      if (storedSegmentsRef.current.has(segmentKey)) {
        console.log("[ModuleContent] Segment already stored, skipping");
        return; // Already stored
      }

      // Case 1: First agent message (welcome/welcome_back)
      if (!userHasSentMessageRef.current && !welcomeStoredRef.current) {
        if (!isReturningUserRef.current) {
          // First-time user: Store the welcome message
          if (addAssistantMessageRef.current) {
            storedSegmentsRef.current.add(segmentKey);
            welcomeStoredRef.current = true;
            console.log("[ModuleContent] Storing welcome message for first-time user:", segment.text.substring(0, 50) + "...");
            addAssistantMessageRef.current(segment.text, "general");
            if (clearAgentTranscriptRef.current) {
              clearAgentTranscriptRef.current();
            }
          } else {
            console.warn("[ModuleContent] Cannot store welcome - addAssistantMessageRef not set");
          }
        } else {
          // Returning user: Skip welcome_back message (don't store)
          welcomeStoredRef.current = true; // Mark as handled so we don't try again
          console.log("[ModuleContent] Skipping welcome_back message for returning user (not storing)");
        }
        return;
      }

      // Case 2: Agent response to user message
      if (userHasSentMessageRef.current) {
        if (addAssistantMessageRef.current) {
          storedSegmentsRef.current.add(segmentKey);
          console.log("[ModuleContent] Storing agent response to chat:", segment.text.substring(0, 50) + "...");
          addAssistantMessageRef.current(segment.text, "general");
          if (clearAgentTranscriptRef.current) {
            clearAgentTranscriptRef.current();
          }
        } else {
          console.warn("[ModuleContent] Cannot store response - addAssistantMessageRef not set");
        }
      } else {
        // Edge case: welcome already handled but user hasn't sent message yet
        console.log("[ModuleContent] Transcript received but not storing (welcome done, no user message yet)");
      }
    },
    [] // No deps needed - uses refs for all dynamic values
  );

  // LiveKit voice session - auto-connect in listen-only mode (text-to-speech)
  // Only auto-connect once we know the session type
  // Note: User messages from FA triggers are handled directly in onFATrigger (above)
  // rather than via data channel round-trip, for immediate display
  const liveKit = useLiveKit({
    conversationId: conversationId || `temp-${course.id}-${module.id}`,
    courseId: course.id,
    userId: userId,
    videoIds: videoIds,
    autoConnect: !isSessionTypeLoading, // Wait for session type check before connecting
    listenOnly: true, // Text-to-speech mode - agent speaks, user listens
    onTranscript: handleTranscriptCallback, // Store agent transcripts in DB
    metadata: {
      courseId: course.id,
      courseTitle: course.title,
      courseDescription: course.description ?? undefined,
      learningObjectives: course.learningObjectives?.join(", "), // Pass as comma-separated string
      moduleId: module.id,
      moduleTitle: module.title,
      lessonId: activeLesson?.id,
      lessonTitle: activeLesson?.title,
      sessionType: sessionType, // Dynamic: "welcome" or "welcome_back"
      userId: userId, // User ID for conversation creation in prism
    },
  });

  // Keep clearAgentTranscriptRef updated for use in transcript callback
  useEffect(() => {
    clearAgentTranscriptRef.current = liveKit.clearAgentTranscript;
  }, [liveKit.clearAgentTranscript]);

  // Show toast notifications for LiveKit connection status
  useEffect(() => {
    if (liveKit.isConnected) {
      toast.success("Voice session started", {
        description: "AI assistant is ready to speak",
        duration: 1000,
      });
    }
  }, [liveKit.isConnected]);

  useEffect(() => {
    if (liveKit.error) {
      toast.error("Voice connection failed", {
        description: liveKit.error,
        duration: 1000,
      });
    }
  }, [liveKit.error]);

  // Show toast when audio is blocked (needs user interaction)
  useEffect(() => {
    if (liveKit.isAudioBlocked) {
      toast.info("Click to enable audio", {
        description: "Browser blocked audio playback",
        duration: 1000,
        action: {
          label: "Enable Audio",
          onClick: () => {
            liveKit.startAudio();
          },
        },
      });
    }
  }, [liveKit.isAudioBlocked, liveKit.startAudio]);

  // KPoint player hook with FA trigger integration
  const { seekTo, getCurrentTime, isPlayerReady, isPlaying } = useKPointPlayer({
    kpointVideoId: selectedLesson?.kpointVideoId,
    onFATrigger: async (message: string, _timestampSeconds: number, topic?: string, _pauseVideo?: boolean) => {
      // Display simple message in chat UI (without topic)
      const displayMessage = "Ask me a formative assessment";
      // But send message with topic to LiveKit for prompt construction
      const agentMessage = topic
        ? `Ask me a formative assessment on "${topic}"`
        : message;

      // Display user message in chat UI and save to DB FIRST (before sending to LiveKit)
      // This ensures the message appears immediately without waiting for round-trip
      if (handleAddUserMessageRef.current) {
        console.log("[ModuleContent] FA trigger - displaying user message in chat, topic:", topic);
        userHasSentMessageRef.current = true; // Mark user interaction
        await handleAddUserMessageRef.current(displayMessage, "fa", "auto");
      } else {
        console.warn("[ModuleContent] Cannot display FA message - handleAddUserMessageRef not set");
      }

      // Then send FA message with topic via LiveKit (prism handles Sarvam API)
      if (liveKit.isConnected) {
        try {
          await liveKit.sendTextToAgent(agentMessage);
        } catch (err) {
          console.error("[ModuleContent] Failed to send FA trigger via LiveKit:", err);
        }
      } else {
        console.warn("[ModuleContent] LiveKit not connected, cannot send FA trigger");
      }
      // Video is already paused by the hook when pauseVideo is true
    },
  });

  // Chat session hook - only used for message storage, all Sarvam calls go through LiveKit
  const { chatMessages, isSending, addUserMessage, addAssistantMessage } = useChatSession({
    courseId: course.id,
    conversationId,
    selectedLesson,
    lessons: module.lessons,
    getCurrentTime,
  });

  // Keep addAssistantMessageRef updated for use in transcript callback
  useEffect(() => {
    addAssistantMessageRef.current = addAssistantMessage;
  }, [addAssistantMessage]);

  // Wrapper for addUserMessage that also sets the flag to track user interaction
  // This prevents welcome messages from being stored - only user messages and responses
  const handleAddUserMessage = useCallback(
    async (message: string, messageType: string = "general", inputType: string = "text") => {
      console.log("[ModuleContent] User sent message, setting userHasSentMessageRef = true");
      userHasSentMessageRef.current = true; // Mark that user has interacted
      await addUserMessage(message, messageType, inputType);
    },
    [addUserMessage]
  );

  // Keep handleAddUserMessageRef updated for use in onUserMessage callback
  useEffect(() => {
    handleAddUserMessageRef.current = handleAddUserMessage;
  }, [handleAddUserMessage]);

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
        onTimestampClick={handleTimestampClick}
        chatMessages={chatMessages}
        isWaitingForResponse={isSending || liveKit.isWaitingForAgentResponse}
        isVideoPlaying={isPlaying}
        hasSelectedLesson={!!selectedLesson}
        // LiveKit agent transcript
        agentTranscript={liveKit.agentTranscript}
        isAgentSpeaking={liveKit.isAgentSpeaking}
        isLiveKitConnected={liveKit.isConnected}
        isReturningUser={isReturningUser}
        // LiveKit functions for FA answers
        sendTextToAgent={liveKit.sendTextToAgent}
        onAddUserMessage={handleAddUserMessage}
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
      onAddUserMessage={handleAddUserMessage}
      isLoading={isSending}
      conversationId={conversationId || undefined}
      courseId={course.id}
      userId={userId}
      videoIds={videoIds}
      // Pass LiveKit state from parent (auto-connected session)
      liveKitState={liveKit}
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
