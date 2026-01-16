"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Script from "next/script";
import { Card } from "@/components/ui/card";
import { ResizableContent } from "@/components/layout/resizable-content";
import { LessonHeader } from "@/components/course/LessonHeader";
import { ChatAgent } from "@/components/agent/ChatAgent";
import { ChatInput } from "@/components/chat/ChatInput";
import { KPointVideoPlayer } from "@/components/video/KPointVideoPlayer";
import { ProductTour } from "@/components/tour/ProductTour";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { BookOpen, X } from "lucide-react";
import { toast } from "sonner";

// Hooks
import { useKPointPlayer } from "@/hooks/useKPointPlayer";
import { useChatSession } from "@/hooks/useChatSession";
import { useLiveKit, TranscriptSegment, UserTranscription, FAIntroData } from "@/hooks/useLiveKit";
import { useSessionType } from "@/hooks/useSessionType";
import { useLearningPanel } from "@/contexts/LearningPanelContext";

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
  const router = useRouter();
  const pathname = usePathname();

  // Get panel state and controls from context
  const { highlightRightPanel, collapsePanel, expandPanel } = useLearningPanel();

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

  // Sync selectedLesson with URL when initialLessonId changes (e.g., clicking lesson in sidebar)
  useEffect(() => {
    if (initialLessonId) {
      const lesson = module.lessons.find((l) => l.id === initialLessonId);
      if (lesson) {
        setSelectedLesson(lesson);
      }
    }
  }, [initialLessonId, module.lessons]);

  // FA intro state - when highlight triggers FA, show intro with buttons first
  const [pendingFAIntro, setPendingFAIntro] = useState<FAIntroData | null>(null);
  // Track when we're waiting for FA intro (agent is speaking intro, data message not yet received)
  const [isWaitingForFAIntro, setIsWaitingForFAIntro] = useState(false);
  // Track when FA intro buttons have been actioned (to disable buttons but keep section visible)
  const [faIntroActioned, setFaIntroActioned] = useState(false);
  // Store the topic when sending FA_INTRO (used to show buttons even if data message fails)
  const pendingFATopicRef = useRef<string | null>(null);

  // Collapse left panel when video panel opens, expand when closed
  useEffect(() => {
    if (selectedLesson?.kpointVideoId) {
      collapsePanel();
    } else {
      expandPanel();
    }
  }, [selectedLesson?.kpointVideoId, collapsePanel, expandPanel]);

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
  // Track which voice messages have been stored to avoid duplicates
  const storedVoiceMessagesRef = useRef<Set<string>>(new Set());
  // Track if user has sent a message - used for storing subsequent agent responses
  const userHasSentMessageRef = useRef<boolean>(false);
  // Track the last user message type (e.g., "fa", "general") for agent response typing
  const lastUserMessageTypeRef = useRef<string>("general");
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
  // Ref for clearUserTranscript to use after storing voice message
  const clearUserTranscriptRef = useRef<(() => void) | null>(null);

  // Keep isReturningUserRef updated
  useEffect(() => {
    isReturningUserRef.current = isReturningUser;
  }, [isReturningUser]);

  // Handle user voice transcription - store final transcriptions in DB
  const handleUserTranscriptCallback = useCallback(
    (transcription: UserTranscription) => {
      console.log("[ModuleContent] User transcription:", {
        text: transcription.text.substring(0, 50),
        isFinal: transcription.isFinal,
        inputType: transcription.inputType,
      });

      if (!transcription.text.trim()) {
        return;
      }

      if (transcription.isFinal) {
        // Check if this voice message was already stored (deduplication)
        const messageKey = transcription.text.trim();
        if (storedVoiceMessagesRef.current.has(messageKey)) {
          console.log("[ModuleContent] Voice message already stored, skipping:", messageKey.substring(0, 30));
          return;
        }
        storedVoiceMessagesRef.current.add(messageKey);

        // Mark that user has interacted (for welcome message logic)
        userHasSentMessageRef.current = true;
        lastUserMessageTypeRef.current = "general"; // Voice input is general Q&A

        // Add to chat and store in DB
        if (handleAddUserMessageRef.current) {
          console.log("[ModuleContent] Storing voice message:", transcription.text.substring(0, 50));
          handleAddUserMessageRef.current(transcription.text, "general", "voice");

          // Clear the user transcript from useLiveKit to avoid showing duplicate
          // (the message is now stored in chatMessages)
          if (clearUserTranscriptRef.current) {
            setTimeout(() => {
              clearUserTranscriptRef.current?.();
            }, 100); // Small delay to let UI update smoothly
          }
        } else {
          console.warn("[ModuleContent] Cannot store voice message - handleAddUserMessageRef not set");
        }
      }
    },
    [] // No deps needed - uses refs for all dynamic values
  );

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

      if (!segment.isAgent || !segment.text.trim()) {
        return;
      }

      // Handle FA intro transcript to show buttons
      if (segment.text.startsWith("We've just completed a full idea covering")) {
        if (segment.isFinal) {
          const text = segment.text;
          const topicRegex = /covering (.*)\\. Let's do a quick check/;
          const match = text.match(topicRegex);
          if (match && match[1]) {
            const topic = match[1];
            console.log("[ModuleContent] FA intro transcript detected, showing buttons for topic:", topic);
            setPendingFAIntro({
              topic: topic,
              introMessage: text,
            });

            // Clear the transcript so it's not stored in history and doesn't appear twice.
            setTimeout(() => {
              if (clearAgentTranscriptRef.current) {
                clearAgentTranscriptRef.current();
              }
            }, 100);
          }
        }
        // Don't store this as a regular message.
        return;
      }
      if (segment.isFinal) {
        const segmentKey = `${segment.id}-${segment.text.length}`;
        if (storedSegmentsRef.current.has(segmentKey)) {
          console.log("[ModuleContent] Segment already stored, skipping");
          return; // Already stored
        }

        // Case 1: First agent message (welcome/welcome_back)
        if (!userHasSentMessageRef.current && !welcomeStoredRef.current) {
          if (!isReturningUserRef.current) {
            // First-time user: Store the welcome message in DB
            if (addAssistantMessageRef.current) {
              storedSegmentsRef.current.add(segmentKey);
              welcomeStoredRef.current = true;
              console.log("[ModuleContent] Storing welcome message for first-time user:", segment.text.substring(0, 50) + "...");
              addAssistantMessageRef.current(segment.text, "general");
              // Clear after a delay to allow ChatAgent to capture and state to update
              setTimeout(() => {
                if (clearAgentTranscriptRef.current) {
                  clearAgentTranscriptRef.current();
                }
              }, 500);
            } else {
              console.warn("[ModuleContent] Cannot store welcome - addAssistantMessageRef not set");
            }
          } else {
            // Returning user: Don't store welcome_back in DB, but mark as handled
            // The welcome_back will be kept in UI via ChatAgent's welcomeMessage state
            welcomeStoredRef.current = true;
            console.log("[ModuleContent] Welcome_back message handled for returning user (not storing in DB)");
            // Clear the agent transcript after a delay so ChatAgent can capture it first
            // (React batches state updates, so we need to wait for the capture useEffect to run)
            setTimeout(() => {
              if (clearAgentTranscriptRef.current) {
                clearAgentTranscriptRef.current();
              }
            }, 500);
          }
          return;
        }

        // Case 2: Agent response to user message
        if (userHasSentMessageRef.current) {
          if (addAssistantMessageRef.current) {
            storedSegmentsRef.current.add(segmentKey);
            // Use the same message type as the user's last message (e.g., "fa" for FA responses)
            const responseType = lastUserMessageTypeRef.current;
            console.log("[ModuleContent] Storing agent response to chat with type:", responseType, segment.text.substring(0, 50) + "...");
            addAssistantMessageRef.current(segment.text, responseType);
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
      }
    },
    [] // No deps needed - uses refs for all dynamic values
  );

  // Handle FA intro complete - agent spoke intro, now show buttons
  const handleFAIntroComplete = useCallback((data: FAIntroData) => {
    console.log("[ModuleContent] FA intro complete, showing buttons for topic:", data.topic);
    setIsWaitingForFAIntro(false); // Stop showing live transcript
    setPendingFAIntro(data); // Show buttons
    setFaIntroActioned(false); // Reset button state for new FA intro
  }, []);

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
    listenOnly: true, // Text-to-speech mode - agent speaks, user listens (voice mode can be enabled dynamically)
    onTranscript: handleTranscriptCallback, // Store agent transcripts in DB
    onUserTranscript: handleUserTranscriptCallback, // Handle user voice transcription
    onFAIntroComplete: handleFAIntroComplete, // Show buttons after FA intro
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

  // Keep clearUserTranscriptRef updated for use in voice transcript callback
  useEffect(() => {
    clearUserTranscriptRef.current = liveKit.clearUserTranscript;
  }, [liveKit.clearUserTranscript]);

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
  const { seekTo, getCurrentTime, isPlayerReady, isPlaying, playerRef } = useKPointPlayer({
    kpointVideoId: selectedLesson?.kpointVideoId,
    onFATrigger: async (_message: string, _timestampSeconds: number, topic?: string, _pauseVideo?: boolean) => {
      // NEW FLOW: Instead of directly starting FA, first show intro with buttons
      // 1. Send FA_INTRO:topic to agent - agent speaks intro message
      // 2. Agent sends fa_intro_complete signal
      // 3. Frontend shows "Start quick check" and "Skip for now" buttons
      // 4. User clicks button to either start FA or resume video

      if (liveKit.isConnected) {
        try {
          const topicName = topic || "the topic";
          const introMessage = `FA_INTRO:${topicName}`;
          console.log("[ModuleContent] FA trigger - sending intro request:", introMessage);
          pendingFATopicRef.current = topicName; // Store topic for button click
          setIsWaitingForFAIntro(true); // Show transcript while agent speaks
          setFaIntroActioned(false); // Reset button state
          await liveKit.sendTextToAgent(introMessage);
        } catch (err) {
          console.error("[ModuleContent] Failed to send FA intro via LiveKit:", err);
          setIsWaitingForFAIntro(false);
          pendingFATopicRef.current = null;
        }
      } else {
        console.warn("[ModuleContent] LiveKit not connected, cannot send FA intro");
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
      console.log("[ModuleContent] User sent message, setting userHasSentMessageRef = true, messageType:", messageType);
      userHasSentMessageRef.current = true; // Mark that user has interacted
      lastUserMessageTypeRef.current = messageType; // Track message type for agent response
      await addUserMessage(message, messageType, inputType);
    },
    [addUserMessage]
  );

  // Keep handleAddUserMessageRef updated for use in onUserMessage callback
  useEffect(() => {
    handleAddUserMessageRef.current = handleAddUserMessage;
  }, [handleAddUserMessage]);

  // Handle FA intro button clicks
  const handleStartQuickCheck = useCallback(async () => {
    // Get topic from pendingFAIntro (data message) or fallback to stored ref
    const topic = pendingFAIntro?.topic || pendingFATopicRef.current;
    console.log("[ModuleContent] handleStartQuickCheck called", { topic, faIntroActioned, pendingFAIntro: !!pendingFAIntro });

    if (!topic || faIntroActioned) {
      console.log("[ModuleContent] Early return - topic:", topic, "faIntroActioned:", faIntroActioned);
      return;
    }

    console.log("[ModuleContent] Starting quick check for topic:", topic);

    // 1. Save the FA intro message to chat history (so it appears in conversation)
    const introMessage = liveKit.agentTranscript || pendingFAIntro?.introMessage;
    if (introMessage && addAssistantMessageRef.current) {
      await addAssistantMessageRef.current(introMessage, "fa");
    }

    // 2. Hide the FA intro section
    setIsWaitingForFAIntro(false);
    setPendingFAIntro(null);
    pendingFATopicRef.current = null;
    setFaIntroActioned(false); // Reset for next time

    // 3. Clear the agent transcript so it doesn't linger
    if (liveKit.clearAgentTranscript) {
      liveKit.clearAgentTranscript();
    }

    // 4. Display user message in chat UI
    const displayMessage = "Ask me a formative assessment";
    if (handleAddUserMessageRef.current) {
      userHasSentMessageRef.current = true;
      await handleAddUserMessageRef.current(displayMessage, "fa", "auto");
    }

    // 5. Send the actual FA request to agent
    if (liveKit.isConnected) {
      try {
        const agentMessage = `Ask me a formative assessment on "${topic}"`;
        await liveKit.sendTextToAgent(agentMessage);
      } catch (err) {
        console.error("[ModuleContent] Failed to send FA request:", err);
      }
    }
  }, [pendingFAIntro, faIntroActioned, liveKit.isConnected, liveKit.sendTextToAgent, liveKit.agentTranscript, liveKit.clearAgentTranscript]);

  const handleSkipQuickCheck = useCallback(() => {
    if (faIntroActioned) return;

    console.log("[ModuleContent] Skipping quick check, resuming video");

    // Disable buttons (but keep FA intro section visible)
    setFaIntroActioned(true);

    // Resume the video
    if (playerRef.current) {
      try {
        if (playerRef.current.playVideo) {
          playerRef.current.playVideo();
        } else if (playerRef.current.setState) {
          // Fallback to setState with PLAYING state
          playerRef.current.setState(1); // PLAYING = 1
        }
        console.log("[ModuleContent] Video resumed after skip");
      } catch (error) {
        console.error("[ModuleContent] Failed to resume video:", error);
      }
    }
  }, [faIntroActioned, playerRef]);

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
    <div className="space-y-6 pb-3">
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
        // Voice mode state for user speech display
        isVoiceModeEnabled={liveKit.isVoiceModeEnabled}
        userTranscript={liveKit.userTranscript}
        isUserSpeaking={liveKit.isUserSpeaking}
        // FA intro state and handlers
        pendingFAIntro={pendingFAIntro}
        isWaitingForFAIntro={isWaitingForFAIntro}
        faIntroActioned={faIntroActioned}
        onStartQuickCheck={handleStartQuickCheck}
        onSkipQuickCheck={handleSkipQuickCheck}
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

  // Handle closing the right panel (video player)
  const handleCloseRightPanel = useCallback(() => {
    setSelectedLesson(null);
    // Also update URL to remove the lesson param so clicking on lessons works again
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  const rightPanel = selectedLesson?.kpointVideoId ? (
    <div
      data-tour="video-panel"
      className={`h-full flex flex-col bg-white p-4 transition-all duration-300 ${
        highlightRightPanel ? "ring-5 ring-purple-500 ring-opacity-75 bg-purple-50" : ""
      }`}
    >
      {/* Video Card */}
      <div
        className={`bg-background rounded-2xl shadow-xl overflow-hidden border-2 transition-all duration-300 relative ${
          highlightRightPanel
            ? "border-purple-400 shadow-purple-300/60 scale-[1.02]"
            : "border-blue-200 hover:border-blue-400 hover:shadow-blue-300/40"
        }`}
      >
        {/* Close Button - positioned on top of video */}
        <button
          onClick={handleCloseRightPanel}
          className="absolute top-3 right-3 z-10 p-2 rounded-xl bg-gray-900/80 hover:bg-gray-900 text-white transition-colors cursor-pointer shadow-lg"
          title="Close video panel"
        >
          <X className="h-5 w-5" />
        </button>

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
      <AnimatedBackground variant="full" intensity="medium" theme="learning" />
      <div
        id="tour-center-anchor"
        className="pointer-events-none fixed left-1/2 top-1/2 h-0 w-0"
        aria-hidden="true"
      />
      <ProductTour
        isReturningUser={isReturningUser}
        isSessionTypeLoading={isSessionTypeLoading}
      />
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
