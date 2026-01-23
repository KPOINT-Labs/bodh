"use client";

import { X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChatAgent } from "@/components/agent/ChatAgent";
import { QuizOverlay } from "@/components/assessment/QuizOverlay";
import { ChatInput } from "@/components/chat/ChatInput";
import { LessonHeader } from "@/components/course/LessonHeader";
import { ErrorMessage } from "@/components/feedback/ErrorMessage";
import { SuccessMessage } from "@/components/feedback/SuccessMessage";
import { ResizableContent } from "@/components/layout/resizable-content";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { fireConfetti } from "@/components/ui/confetti";
import { MessageBubble } from "@/components/ui/message-bubble";
import { KPointVideoPlayer } from "@/components/video/KPointVideoPlayer";
import { useAudioContext } from "@/contexts/AudioContext";
import { useLearningPanel } from "@/contexts/LearningPanelContext";
import { useActionButtons } from "@/hooks/useActionButtons";
import { useAssessmentQuiz } from "@/hooks/useAssessmentQuiz";
import { useChatSession } from "@/hooks/useChatSession";
// Hooks
import { useKPointPlayer } from "@/hooks/useKPointPlayer";
import {
  type TranscriptSegment,
  type UserTranscription,
  useLiveKit,
} from "@/hooks/useLiveKit";
import { useSessionType } from "@/hooks/useSessionType";
import { useTour } from "@/hooks/useTour";
import type { ActionDependencies } from "@/lib/actions/actionHandlers";
import type { ActionType } from "@/lib/actions/actionRegistry";
import {
  getAnsweredQuestionIds,
  recordAttempt,
} from "@/lib/actions/assessment";
import { getLessonProgress } from "@/lib/actions/lesson-progress";
import { audioManager } from "@/lib/audio/quizAudio";
import { mockTourData } from "@/lib/mockTourData";
import type { LessonQuiz, WarmupQuestion } from "@/types/assessment";

interface Lesson {
  id: string;
  title: string;
  orderIndex: number;
  kpointVideoId?: string | null;
  youtubeVideoId?: string | null;
  description?: string | null;
  duration?: number; // Duration in seconds
  quiz?: unknown; // Quiz configuration for warmup and in-lesson questions (JSON from Prisma)
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
  initialPanelOpen?: boolean;
  isTourMode?: boolean;
}

export function ModuleContent({
  course,
  module,
  userId,
  initialLessonId,
  initialPanelOpen = false,
  isTourMode = false,
}: ModuleContentProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Get panel state and controls from context (needed for both modes)
  const { highlightRightPanel, collapsePanel, expandPanel } =
    useLearningPanel();

  // Tour mode: simplified rendering with mock data
  const { startTour, isReady: isTourReady } = useTour({
    onExpandSidebar: expandPanel,
  });

  // Auto-start tour when in tour mode and tour is ready
  useEffect(() => {
    if (isTourMode && isTourReady) {
      // Small delay to ensure DOM is fully rendered
      const timer = setTimeout(() => {
        startTour();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isTourMode, isTourReady, startTour]);

  // Early return for tour mode with simplified UI
  if (isTourMode) {
    const tourHeader = (
      <LessonHeader courseTitle={course.title} moduleTitle={module.title} />
    );

    const tourContent = (
      <div className="space-y-6 pb-3">
        {/* Chat area for tour - showing mock messages */}
        <div className="tour-chat-area">
          {mockTourData.chatMessages.map((message) => (
            <MessageBubble
              content={message.content}
              enableAnimation={false}
              key={message.id}
              type={message.type}
            />
          ))}
        </div>
      </div>
    );

    const tourFooter = (
      <ChatInput
        conversationId={undefined}
        courseId={course.id} // No-op in tour mode
        isLoading={false}
        liveKitState={{
          isConnected: false,
          isConnecting: false,
          isMuted: false,
          isSpeaking: false,
          audioLevel: 0,
          error: null,
          agentTranscript: "",
          transcriptSegments: [],
          isAgentSpeaking: false,
          isAudioBlocked: false,
          isWaitingForAgentResponse: false,
          isVoiceModeEnabled: false,
          userTranscript: "",
          isUserSpeaking: false,
          connect: async () => {},
          disconnect: async () => {},
          toggleMute: async () => {},
          startAudio: async () => {},
          sendTextToAgent: async () => {},
          clearAgentTranscript: () => {},
          enableVoiceMode: async () => false,
          disableVoiceMode: async () => false,
          clearUserTranscript: () => {},
        }}
        onAddUserMessage={() => {}}
        placeholder="Ask me anything about this lesson..."
        userId={userId}
        videoIds={[]}
      />
    );

    const tourRightPanel = (
      <div className="tour-video-panel flex h-full flex-col bg-white p-4">
        <div className="overflow-hidden rounded-2xl border-2 border-blue-200 bg-background shadow-xl">
          <div className="flex aspect-video items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="mb-2 text-4xl">🎥</div>
              <div className="font-semibold text-gray-700 text-lg">
                {mockTourData.videoPlaceholder.title}
              </div>
              <div className="mt-1 text-gray-500 text-sm">
                {mockTourData.videoPlaceholder.description}
              </div>
            </div>
          </div>
          <div className="p-3">
            <h3 className="font-medium text-foreground text-xs">
              {mockTourData.videoPlaceholder.title}
            </h3>
          </div>
        </div>
      </div>
    );

    return (
      <>
        <AnimatedBackground
          intensity="medium"
          theme="learning"
          variant="full"
        />
        <ResizableContent
          content={tourContent}
          footer={tourFooter}
          header={tourHeader}
          rightPanel={tourRightPanel}
        />
      </>
    );
  }

  // Get audio context for mute state and callback registration
  const {
    isMuted: isAudioMuted,
    registerMuteCallback,
    unregisterMuteCallback,
  } = useAudioContext();

  // Find initial lesson from URL parameter or default to null (will show first lesson)
  const getInitialLesson = (): Lesson | null => {
    if (initialLessonId) {
      const lesson = module.lessons.find((l) => l.id === initialLessonId);
      return lesson || null;
    }
    return null;
  };

  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(
    getInitialLesson
  );
  const [isPanelClosed, setIsPanelClosed] = useState(!initialPanelOpen); // Panel closed by default unless ?panel=true
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [videoStartOffset, setVideoStartOffset] = useState<number | null>(null);
  const [lessonProgress, setLessonProgress] = useState<{
    lastPosition: number;
    status: string;
  } | null>(null);

  const [activeInlessonQuestion, setActiveInlessonQuestion] = useState<{
    questionId: string;
    messageId: string;
    type: "mcq" | "text";
    correctOption?: string;
  } | null>(null);

  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);

  // Sync selectedLesson with URL when initialLessonId changes (e.g., clicking lesson in sidebar)
  // Note: Panel state is controlled by ?panel=true search param, not by lesson selection
  useEffect(() => {
    if (initialLessonId) {
      const lesson = module.lessons.find((l) => l.id === initialLessonId);
      if (lesson) {
        setSelectedLesson(lesson);
      }
    }
  }, [initialLessonId, module.lessons]);

  // Get active lesson (selected or first) - defined early so it can be used in useEffects
  const sortedLessons = [...module.lessons].sort(
    (a, b) => a.orderIndex - b.orderIndex
  );
  const activeLesson = selectedLesson || sortedLessons[0];

  // Fetch lesson progress when lesson is selected
  useEffect(() => {
    if (!(activeLesson && userId)) {
      setLessonProgress(null);
      return;
    }

    async function fetchProgress() {
      try {
        const progress = await getLessonProgress(userId, activeLesson?.id);
        setLessonProgress(progress);
      } catch (error) {
        console.error("Failed to fetch lesson progress:", error);
        setLessonProgress(null);
      }
    }

    fetchProgress();
  }, [activeLesson?.id, userId, activeLesson]);

  // Collapse left panel when video panel opens, expand when closed
  useEffect(() => {
    if (activeLesson?.kpointVideoId) {
      collapsePanel();
    } else {
      expandPanel();
    }
  }, [activeLesson?.kpointVideoId, collapsePanel, expandPanel]);

  // Use youtubeVideoId for Sarvam AI (video context), kpointVideoId for player
  const videoIds = activeLesson?.youtubeVideoId
    ? [activeLesson.youtubeVideoId]
    : [];

  // Determine session type based on enrollment + lesson progress
  // Session types: course_welcome, course_welcome_back, lesson_welcome, lesson_welcome_back
  // Also returns lessonNumber (1-based global) and prevLessonTitle for warm-up context
  const {
    sessionType,
    isLoading: isSessionTypeLoading,
    isReturningUser,
    isFirstCourseVisit,
    isIntroLesson,
    isFirstLessonVisit,
    lessonNumber,
    prevLessonTitle,
    courseProgress,
    lessonProgress: sessionLessonProgress,
  } = useSessionType({
    userId,
    courseId: course.id,
    lessonId: activeLesson?.id,
  });

  // Ref for sendTextToAgent to use in assessment quiz (set after useLiveKit)
  const sendTextToAgentRef = useRef<
    ((message: string) => Promise<void>) | null
  >(null);

  // Assessment quiz hook for warmup and in-lesson questions
  const assessmentQuiz = useAssessmentQuiz({
    userId,
    lessonId: activeLesson?.id,
    quiz: (activeLesson?.quiz ?? null) as LessonQuiz | null,
    onQuizComplete: () => {
      // Resume video after quiz is complete
      if (playerRef.current?.playVideo) {
        playerRef.current.playVideo();
      }
    },
    onTextEvaluationRequest: async (questionId, question, answer) => {
      // Send to LiveKit agent for evaluation
      if (sendTextToAgentRef.current) {
        const message = JSON.stringify({
          type: "quiz_evaluate_text",
          questionId,
          question,
          answer,
        });
        await sendTextToAgentRef.current(`QUIZ_EVAL:${message}`);
      }
    },
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
  const welcomeMessageIdRef = useRef<string | undefined>(undefined);
  // Ref for isReturningUser to use in callback
  const isReturningUserRef = useRef<boolean>(isReturningUser);
  // Ref for addAssistantMessage to use in callback (set after useChatSession)
  const addAssistantMessageRef = useRef<
    | ((message: string, messageType?: string) => Promise<string | undefined>)
    | null
  >(null);
  // Ref for clearAgentTranscript to use in callback (set after useLiveKit)
  const clearAgentTranscriptRef = useRef<(() => void) | null>(null);
  // Ref for handleAddUserMessage to use in onUserMessage callback (set after useChatSession)
  const handleAddUserMessageRef = useRef<
    | ((
        message: string,
        messageType?: string,
        inputType?: string
      ) => Promise<void>)
    | null
  >(null);
  // Ref for clearUserTranscript to use after storing voice message
  const clearUserTranscriptRef = useRef<(() => void) | null>(null);
  // Ref for showAction to use in callbacks (set after useActionButtons)
  const showActionRef = useRef<
    | ((
        type: ActionType,
        metadata?: Record<string, unknown>,
        anchorMessageId?: string
      ) => void)
    | null
  >(null);
  // Ref for dismissAction to use in handleAddUserMessage (set after useActionButtons)
  const dismissActionRef = useRef<(() => void) | null>(null);
  // Refs for in-lesson question functions (set after useChatSession)
  const addInlessonQuestionRef = useRef<
    | ((question: {
        id: string;
        question: string;
        type: "mcq" | "text";
        options?: { id: string; text: string }[];
        correctOption?: string;
      }) => string | null)
    | null
  >(null);
  const markInlessonAnsweredRef = useRef<((messageId: string) => void) | null>(
    null
  );
  const markInlessonSkippedRef = useRef<((messageId: string) => void) | null>(
    null
  );
  const addInlessonFeedbackRef = useRef<
    ((isCorrect: boolean, feedback: string) => string | undefined) | null
  >(null);
  const setActiveInlessonQuestionRef = useRef<
    | ((
        question: {
          questionId: string;
          messageId: string;
          type: "mcq" | "text";
          correctOption?: string;
        } | null
      ) => void)
    | null
  >(null);

  // Refs for warmup question functions (set after useChatSession)
  const addWarmupQuestionRef = useRef<
    | ((question: {
        id: string;
        question: string;
        options?: { id: string; text: string }[];
        correctOption?: string;
      }) => string | null)
    | null
  >(null);
  const markWarmupAnsweredRef = useRef<
    ((messageId: string, userAnswer?: string) => void) | null
  >(null);
  const markWarmupSkippedRef = useRef<((messageId: string) => void) | null>(
    null
  );
  const addWarmupFeedbackRef = useRef<
    ((isCorrect: boolean, feedback: string) => string | undefined) | null
  >(null);

  // State for tracking active warmup flow
  const [warmupState, setWarmupState] = useState<{
    isActive: boolean;
    questions: WarmupQuestion[];
    currentIndex: number;
    messageIds: Map<string, string>; // questionId -> messageId
    correctCount: number;
    incorrectCount: number;
    skippedCount: number;
  }>({
    isActive: false,
    questions: [],
    currentIndex: 0,
    messageIds: new Map(),
    correctCount: 0,
    incorrectCount: 0,
    skippedCount: 0,
  });

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
          console.log(
            "[ModuleContent] Voice message already stored, skipping:",
            messageKey.substring(0, 30)
          );
          return;
        }
        storedVoiceMessagesRef.current.add(messageKey);

        // Mark that user has interacted (for welcome message logic)
        userHasSentMessageRef.current = true;
        lastUserMessageTypeRef.current = "general"; // Voice input is general Q&A

        // Add to chat and store in DB
        if (handleAddUserMessageRef.current) {
          console.log(
            "[ModuleContent] Storing voice message:",
            transcription.text.substring(0, 50)
          );
          handleAddUserMessageRef.current(
            transcription.text,
            "general",
            "voice"
          );

          // Clear the user transcript from useLiveKit to avoid showing duplicate
          // (the message is now stored in chatMessages)
          if (clearUserTranscriptRef.current) {
            setTimeout(() => {
              clearUserTranscriptRef.current?.();
            }, 100); // Small delay to let UI update smoothly
          }
        } else {
          console.warn(
            "[ModuleContent] Cannot store voice message - handleAddUserMessageRef not set"
          );
        }
      }
    },
    [] // No deps needed - uses refs for all dynamic values
  );

  // Handle LiveKit agent transcript - store in DB and add to chat when final
  // Welcome message: Store for first-time users, skip for returning users
  // Other agent responses: Store after user sends a message
  const handleTranscriptCallback = useCallback(
    async (segment: TranscriptSegment) => {
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

      if (!(segment.isAgent && segment.text.trim())) {
        return;
      }

      // Handle FA intro transcript to show buttons
      if (
        segment.text.startsWith("We've just completed a full idea covering")
      ) {
        if (segment.isFinal) {
          const text = segment.text;
          const topicRegex = /covering ([^.]+)\. Let's do a quick check/;
          const match = text.match(topicRegex);
          if (match?.[1]) {
            const topic = match[1];
            console.log(
              "[ModuleContent] FA intro transcript detected, showing buttons for topic:",
              topic
            );

            let faMessageId: string | undefined;
            if (addAssistantMessageRef.current) {
              faMessageId = await addAssistantMessageRef.current(text, "fa");
            }

            if (showActionRef.current) {
              const lastAssistantId = getLastAssistantMessageId?.();
              const anchorMessageId =
                faMessageId ?? lastAssistantId ?? `fa-intro-${segment.id}`;
              console.log("[ModuleContent] FA intro showAction", {
                topic,
                hasAddAssistant: !!addAssistantMessageRef.current,
                lastAssistantId,
                faMessageId,
                anchorMessageId,
                segmentId: segment.id,
              });
              showActionRef.current(
                "fa_intro",
                { topic, introMessage: text },
                anchorMessageId
              );
            }

            // Clear the transcript so it doesn't appear twice (already saved to DB above)
            setTimeout(() => {
              if (clearAgentTranscriptRef.current) {
                clearAgentTranscriptRef.current();
              }
            }, 100);
          }
        }
        // Don't store this as a regular message (already handled above).
        return;
      }
      if (segment.isFinal) {
        const segmentKey = `${segment.id}-${segment.text.length}`;
        if (storedSegmentsRef.current.has(segmentKey)) {
          console.log("[ModuleContent] Segment already stored, skipping");
          return; // Already stored
        }

        // Case 1: First agent message (welcome/welcome_back)
        if (!(userHasSentMessageRef.current || welcomeStoredRef.current)) {
          if (isReturningUserRef.current) {
            // Returning user: Don't store welcome_back in DB, but mark as handled
            // The welcome_back will be kept in UI via ChatAgent's welcomeMessage state
            welcomeStoredRef.current = true;
            console.log(
              "[ModuleContent] Welcome_back message handled for returning user (not storing in DB)"
            );
            // Clear the agent transcript after a delay so ChatAgent can capture it first
            // (React batches state updates, so we need to wait for the capture useEffect to run)
            setTimeout(() => {
              if (clearAgentTranscriptRef.current) {
                clearAgentTranscriptRef.current();
              }
            }, 500);
          } else {
            // First-time user: Store the welcome message in DB
            if (addAssistantMessageRef.current) {
              storedSegmentsRef.current.add(segmentKey);
              welcomeStoredRef.current = true;
              console.log(
                "[ModuleContent] Storing welcome message for first-time user:",
                `${segment.text.substring(0, 50)}...`
              );
              const savedMessageId = await addAssistantMessageRef.current(
                segment.text,
                "general"
              );
              welcomeMessageIdRef.current = savedMessageId;
              // Clear after a delay to allow ChatAgent to capture and state to update
              setTimeout(() => {
                if (clearAgentTranscriptRef.current) {
                  clearAgentTranscriptRef.current();
                }
              }, 500);
            } else {
              console.warn(
                "[ModuleContent] Cannot store welcome - addAssistantMessageRef not set"
              );
            }
          }
          return;
        }

        // Case 2: Agent response to user message
        if (userHasSentMessageRef.current) {
          if (addAssistantMessageRef.current) {
            storedSegmentsRef.current.add(segmentKey);
            // Use the same message type as the user's last message (e.g., "fa" for FA responses)
            const responseType = lastUserMessageTypeRef.current;
            console.log(
              "[ModuleContent] Storing agent response to chat with type:",
              responseType,
              `${segment.text.substring(0, 50)}...`
            );
            addAssistantMessageRef.current(segment.text, responseType);
            if (clearAgentTranscriptRef.current) {
              clearAgentTranscriptRef.current();
            }
          } else {
            console.warn(
              "[ModuleContent] Cannot store response - addAssistantMessageRef not set"
            );
          }
        } else {
          // Edge case: welcome already handled but user hasn't sent message yet
          console.log(
            "[ModuleContent] Transcript received but not storing (welcome done, no user message yet)"
          );
        }
      }
    },
    [getLastAssistantMessageId] // No deps needed - uses refs for all dynamic values
  );

  // Handle FA intro complete - agent spoke intro, now show buttons
  const handleFAIntroComplete = useCallback(
    async (data: { topic: string; introMessage: string }) => {
      console.log(
        "[ModuleContent] FA intro complete, showing buttons for topic:",
        data.topic
      );

      // Save the FA intro message to DB and show in chat
      let faMessageId: string | undefined;
      if (data.introMessage && addAssistantMessageRef.current) {
        faMessageId = await addAssistantMessageRef.current(
          data.introMessage,
          "fa"
        );
      }

      if (showActionRef.current) {
        const lastAssistantId = getLastAssistantMessageId?.();
        const anchorMessageId = faMessageId ?? lastAssistantId;
        showActionRef.current(
          "fa_intro",
          { topic: data.topic, introMessage: data.introMessage },
          anchorMessageId
        );
      }
    },
    [getLastAssistantMessageId]
  );

  // LiveKit voice session - auto-connect in listen-only mode (text-to-speech)
  // Only auto-connect once we know the session type
  // Note: User messages from FA triggers are handled directly in onFATrigger (above)
  // rather than via data channel round-trip, for immediate display
  const liveKit = useLiveKit({
    conversationId: conversationId || `temp-${course.id}-${module.id}`,
    courseId: course.id,
    userId,
    videoIds,
    autoConnect: !isSessionTypeLoading, // Wait for session type check before connecting
    listenOnly: true, // Text-to-speech mode - agent speaks, user listens (voice mode can be enabled dynamically)
    onTranscript: handleTranscriptCallback, // Store agent transcripts in DB
    onUserTranscript: handleUserTranscriptCallback, // Handle user voice transcription
    onFAIntroComplete: handleFAIntroComplete, // Show buttons after FA intro
    onQuizEvaluationResult: assessmentQuiz.handleTextEvaluationResult, // Handle quiz text evaluation results
    metadata: {
      courseId: course.id,
      courseTitle: course.title,
      courseDescription: course.description ?? undefined,
      learningObjectives: course.learningObjectives?.join(", "), // Pass as comma-separated string
      moduleId: module.id,
      moduleTitle: module.title,
      lessonId: activeLesson?.id,
      lessonTitle: activeLesson?.title,
      lessonOrderIndex: activeLesson?.orderIndex,
      lessonNumber, // 1-based global lesson number
      prevLessonTitle: prevLessonTitle ?? undefined, // Previous lesson title for warm-up context (from API)
      // New session type system: course_welcome | course_welcome_back | lesson_welcome | lesson_welcome_back
      sessionType,
      isFirstCourseVisit,
      isIntroLesson,
      isFirstLessonVisit,
      // Course progress for welcome_back messages
      courseProgress: courseProgress
        ? JSON.stringify(courseProgress)
        : undefined,
      // Lesson progress for lesson_welcome_back messages
      lessonProgressData: sessionLessonProgress
        ? JSON.stringify(sessionLessonProgress)
        : undefined,
      userId, // User ID for conversation creation in prism
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

  // Keep sendTextToAgentRef updated for use in assessment quiz
  useEffect(() => {
    sendTextToAgentRef.current = liveKit.sendTextToAgent;
  }, [liveKit.sendTextToAgent]);

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

  // Ref to track current mute state for initial sync (avoids dependency issues)
  const isAudioMutedRef = useRef(isAudioMuted);
  useEffect(() => {
    isAudioMutedRef.current = isAudioMuted;
  }, [isAudioMuted]);

  // Register callback to sync AudioToggleButton mute state with LiveKit audio output
  useEffect(() => {
    if (!liveKit.isConnected) {
      return;
    }

    // Sync initial mute state when LiveKit connects
    const initialMuted = isAudioMutedRef.current;
    console.log(
      "[ModuleContent] LiveKit connected, syncing initial mute state:",
      initialMuted
    );
    liveKit.setAudioOutputEnabled(!initialMuted).catch((err) => {
      console.warn("[ModuleContent] Failed to sync initial mute state:", err);
    });

    // Register callback for future mute state changes
    const handleMuteChange = (muted: boolean) => {
      console.log("[ModuleContent] AudioContext mute changed:", muted);
      liveKit.setAudioOutputEnabled(!muted).catch((err) => {
        console.warn(
          "[ModuleContent] Failed to sync audio output with mute state:",
          err
        );
      });
    };

    registerMuteCallback(handleMuteChange);
    console.log(
      "[ModuleContent] Registered mute callback for LiveKit audio output"
    );

    return () => {
      unregisterMuteCallback(handleMuteChange);
      console.log("[ModuleContent] Unregistered mute callback");
    };
  }, [
    liveKit.isConnected,
    liveKit.setAudioOutputEnabled,
    registerMuteCallback,
    unregisterMuteCallback,
  ]);

  // Handle video end - auto-play next lesson
  const handleVideoEnd = useCallback(async () => {
    console.log("[ModuleContent] handleVideoEnd called", {
      activeLesson: activeLesson?.title,
      lessonsCount: module.lessons.length,
    });

    if (!(activeLesson && module.lessons.length)) {
      console.log(
        "[ModuleContent] handleVideoEnd early return - no active lesson or lessons"
      );
      return;
    }

    // Sort lessons by orderIndex to find the next one
    const sortedLessonsList = [...module.lessons].sort(
      (a, b) => a.orderIndex - b.orderIndex
    );
    const currentIndex = sortedLessonsList.findIndex(
      (l) => l.id === activeLesson.id
    );

    // Check if there's a next lesson
    if (currentIndex >= 0 && currentIndex < sortedLessonsList.length - 1) {
      const nextLesson = sortedLessonsList[currentIndex + 1];
      console.log(
        `[ModuleContent] Video ended, auto-playing next lesson: ${nextLesson.title}`
      );

      // Select the next lesson (this will trigger the video player to load)
      setSelectedLesson(nextLesson);

      // Notify the agent about the new lesson to start a new conversation
      if (liveKit.isConnected) {
        try {
          const message = `The user has started watching the next lesson: "${nextLesson.title}". Please greet them briefly and let them know you're here to help with any questions about this lesson.`;
          await liveKit.sendTextToAgent(message);
        } catch (err) {
          console.error(
            "[ModuleContent] Failed to notify agent about next lesson:",
            err
          );
        }
      }

      toast.success("Playing next lesson", {
        description: nextLesson.title,
        duration: 2000,
      });
    } else {
      // No more lessons in current module - try to get next module
      console.log(
        "[ModuleContent] Video ended, no more lessons in module. Checking for next module..."
      );

      try {
        const response = await fetch(
          `/api/courses/${course.id}/next-module?currentModuleId=${module.id}`
        );
        const data = await response.json();

        if (
          data.success &&
          data.hasNextModule &&
          data.nextModule?.firstLesson
        ) {
          const nextModule = data.nextModule;
          console.log(`[ModuleContent] Found next module: ${nextModule.title}`);

          toast.success("Moving to next module", {
            description: nextModule.title,
            duration: 2000,
          });

          // Navigate to the next module's first lesson
          // The new page will auto-connect to LiveKit and start the conversation
          router.push(
            `${pathname.replace(module.id, nextModule.id)}?lesson=${nextModule.firstLesson.id}`
          );
        } else {
          console.log("[ModuleContent] No more modules in course");
          toast.info("Course complete!", {
            description:
              "Congratulations! You've finished all modules in this course",
            duration: 5000,
          });
        }
      } catch (err) {
        console.error("[ModuleContent] Failed to fetch next module:", err);
        toast.info("Module complete!", {
          description: "You've finished all lessons in this module",
          duration: 3000,
        });
      }
    }
  }, [
    activeLesson,
    module.lessons,
    module.id,
    course.id,
    liveKit.isConnected,
    liveKit.sendTextToAgent,
    router,
    pathname,
  ]);

  // Get video duration from lesson (stored in seconds in database)
  const videoDuration = activeLesson?.duration || 0;

  // Calculate effective start offset (manual timestamp OR saved position for in_progress lessons)
  const effectiveStartOffset =
    videoStartOffset ??
    (lessonProgress?.status === "in_progress"
      ? lessonProgress.lastPosition
      : null);

  // DEBUG: Log progress tracking parameters
  console.log("[ModuleContent] Progress tracking params:", {
    userId,
    lessonId: activeLesson?.id,
    videoDuration,
    hasKpointVideoId: !!activeLesson?.kpointVideoId,
  });

  // KPoint player hook with FA trigger integration
  const { seekTo, getCurrentTime, isPlayerReady, isPlaying, playerRef } =
    useKPointPlayer({
      kpointVideoId: activeLesson?.kpointVideoId,
      userId,
      lessonId: activeLesson?.id,
      videoDuration,
      onVideoEnd: handleVideoEnd,
      quizData: (activeLesson?.quiz ?? null) as LessonQuiz | null,
      onInLessonTrigger: (questionId: string) => {
        // Find the question from quiz data
        const quizData = activeLesson?.quiz as LessonQuiz | null;
        const question = quizData?.inlesson?.find((q) => q.id === questionId);

        console.log("[ModuleContent] 🎬 In-lesson question triggered:", {
          questionId,
          activeLessonId: activeLesson?.id,
          hasQuiz: !!quizData,
          questionFound: !!question,
          questionType: question?.type,
        });

        if (!question) {
          console.warn("[ModuleContent] Question not found:", questionId);
          return;
        }

        // Ensure chat panel is open
        setIsPanelClosed(false);
        expandPanel();

        // Add question to chat
        if (addInlessonQuestionRef.current) {
          const messageId = addInlessonQuestionRef.current({
            id: question.id,
            question: question.question,
            type: question.type,
            options: question.options,
            correctOption: question.correct_option,
          });

          // Track active question for answer handling
          if (messageId && setActiveInlessonQuestionRef.current) {
            setActiveInlessonQuestionRef.current({
              questionId: question.id,
              messageId,
              type: question.type,
              correctOption: question.correct_option,
            });
          }

          console.log("[ModuleContent] In-lesson question added to chat:", {
            messageId,
            questionId: question.id,
            type: question.type,
          });
        } else {
          console.warn("[ModuleContent] addInlessonQuestionRef not ready");
        }
      },
      onFATrigger: async (
        _message: string,
        _timestampSeconds: number,
        topic?: string,
        _pauseVideo?: boolean
      ) => {
        // NEW FLOW: Instead of directly starting FA, first show intro with buttons
        // 1. Send FA_INTRO:topic to agent - agent speaks intro message
        // 2. Agent sends fa_intro_complete signal (or transcript callback detects it)
        // 3. Frontend shows "Start quick check" and "Skip for now" buttons via action registry
        // 4. User clicks button to either start FA or resume video

        if (liveKit.isConnected) {
          try {
            const topicName = topic || "the topic";
            const introMessage = `FA_INTRO:${topicName}`;
            console.log(
              "[ModuleContent] FA trigger - sending intro request:",
              introMessage
            );
            await liveKit.sendTextToAgent(introMessage);
            // Buttons will be shown when agent finishes speaking (via handleFAIntroComplete or transcript callback)
          } catch (err) {
            console.error(
              "[ModuleContent] Failed to send FA intro via LiveKit:",
              err
            );
          }
        } else {
          console.warn(
            "[ModuleContent] LiveKit not connected, cannot send FA intro"
          );
        }
        // Video is already paused by the hook when pauseVideo is true
      },
    });

  // Chat session hook - only used for message storage, all Sarvam calls go through LiveKit
  const {
    chatMessages,
    isSending,
    addUserMessage,
    addAssistantMessage,
    addInlessonQuestion,
    markInlessonAnswered,
    markInlessonSkipped,
    addInlessonFeedback,
    getLastAssistantMessageId,
    // Warmup support
    addWarmupQuestion,
    markWarmupAnswered,
    markWarmupSkipped,
    addWarmupFeedback,
  } = useChatSession({
    courseId: course.id,
    conversationId,
    selectedLesson: activeLesson,
    lessons: module.lessons,
    getCurrentTime,
  });

  // Keep addAssistantMessageRef updated for use in transcript callback
  useEffect(() => {
    addAssistantMessageRef.current = addAssistantMessage;
  }, [addAssistantMessage]);

  // Keep in-lesson refs updated for use in onInLessonTrigger callback
  useEffect(() => {
    addInlessonQuestionRef.current = addInlessonQuestion;
    markInlessonAnsweredRef.current = markInlessonAnswered;
    markInlessonSkippedRef.current = markInlessonSkipped;
    addInlessonFeedbackRef.current = addInlessonFeedback;
    setActiveInlessonQuestionRef.current = setActiveInlessonQuestion;
  }, [
    addInlessonQuestion,
    markInlessonAnswered,
    markInlessonSkipped,
    addInlessonFeedback,
  ]);

  // Keep warmup refs updated
  useEffect(() => {
    addWarmupQuestionRef.current = addWarmupQuestion;
    markWarmupAnsweredRef.current = markWarmupAnswered;
    markWarmupSkippedRef.current = markWarmupSkipped;
    addWarmupFeedbackRef.current = addWarmupFeedback;
  }, [
    addWarmupQuestion,
    markWarmupAnswered,
    markWarmupSkipped,
    addWarmupFeedback,
  ]);

  // Inline warmup handler - replaces popup-based assessmentQuiz.startWarmup
  const handleInlineWarmup = useCallback(async () => {
    const quizData = activeLesson?.quiz as LessonQuiz | null;
    if (
      !quizData?.warmup ||
      quizData.warmup.length === 0 ||
      !activeLesson?.id
    ) {
      console.warn("[ModuleContent] No warmup questions available");
      return;
    }

    // Get already answered question IDs
    const answeredIds = await getAnsweredQuestionIds(
      userId,
      activeLesson.id,
      "warmup"
    );

    // Filter out already answered questions
    const unansweredQuestions = quizData.warmup.filter(
      (q: WarmupQuestion) => !answeredIds.has(q.id)
    );

    if (unansweredQuestions.length === 0) {
      console.log("[ModuleContent] All warmup questions already answered");
      // Show completion message and continue
      if (showActionRef.current) {
        showActionRef.current("warmup_complete", {});
      }
      return;
    }

    console.log(
      "[ModuleContent] Starting inline warmup with",
      unansweredQuestions.length,
      "questions"
    );

    // Add first question to chat
    const firstQuestion = unansweredQuestions[0];
    const messageId = addWarmupQuestion({
      id: firstQuestion.id,
      question: firstQuestion.question,
      options: firstQuestion.options,
      correctOption: firstQuestion.correct_option,
    });

    if (messageId) {
      // Set up warmup state to track progress
      const messageIds = new Map<string, string>();
      messageIds.set(firstQuestion.id, messageId);

      setWarmupState({
        isActive: true,
        questions: unansweredQuestions,
        currentIndex: 0,
        messageIds,
        correctCount: 0,
        incorrectCount: 0,
        skippedCount: 0,
      });
    }
  }, [activeLesson?.quiz, activeLesson?.id, userId, addWarmupQuestion]);

  // Handler for warmup MCQ answers
  const handleWarmupAnswer = useCallback(
    async (questionId: string, answer: string) => {
      console.log("[ModuleContent] Warmup answer received:", {
        questionId,
        answer,
      });

      if (!warmupState.isActive) {
        console.warn("[ModuleContent] No active warmup");
        return;
      }

      const currentQuestion = warmupState.questions[warmupState.currentIndex];
      if (!currentQuestion || currentQuestion.id !== questionId) {
        console.warn("[ModuleContent] Question ID mismatch");
        return;
      }

      const messageId = warmupState.messageIds.get(questionId);
      if (!messageId) {
        console.warn("[ModuleContent] No message ID for question");
        return;
      }

      const isCorrect = answer === currentQuestion.correct_option;
      const feedback =
        currentQuestion.feedback ||
        (isCorrect
          ? "Great job! You got it right."
          : "That's not quite right, but don't worry - keep learning!");

      // Mark message as answered (triggers celebration in InLessonQuestion)
      markWarmupAnswered(messageId, answer);

      // Record attempt in DB
      if (activeLesson?.id) {
        await recordAttempt({
          odataUserId: userId,
          lessonId: activeLesson.id,
          assessmentType: "warmup",
          questionId,
          answer,
          isCorrect,
          isSkipped: false,
          feedback,
        });
      }

      // Wait for celebration animation
      await new Promise((resolve) =>
        setTimeout(resolve, isCorrect ? 2500 : 2000)
      );

      // Add feedback message
      addWarmupFeedback(isCorrect, feedback);

      // Check if there are more questions
      const nextIndex = warmupState.currentIndex + 1;
      if (nextIndex < warmupState.questions.length) {
        // Add next question after a short delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        const nextQuestion = warmupState.questions[nextIndex];
        const nextMessageId = addWarmupQuestion({
          id: nextQuestion.id,
          question: nextQuestion.question,
          options: nextQuestion.options,
          correctOption: nextQuestion.correct_option,
        });

        if (nextMessageId) {
          setWarmupState((prev) => {
            const newMessageIds = new Map(prev.messageIds);
            newMessageIds.set(nextQuestion.id, nextMessageId);
            return {
              ...prev,
              currentIndex: nextIndex,
              messageIds: newMessageIds,
              correctCount: prev.correctCount + (isCorrect ? 1 : 0),
              incorrectCount: prev.incorrectCount + (isCorrect ? 0 : 1),
            };
          });
        }
      } else {
        // Warmup complete
        console.log("[ModuleContent] Warmup complete!");
        const totalQuestions = warmupState.questions.length;
        const finalCorrectCount =
          warmupState.correctCount + (isCorrect ? 1 : 0);
        const _finalIncorrectCount =
          warmupState.incorrectCount + (isCorrect ? 0 : 1);

        setWarmupState({
          isActive: false,
          questions: [],
          currentIndex: 0,
          messageIds: new Map(),
          correctCount: 0,
          incorrectCount: 0,
          skippedCount: 0,
        });

        // Add completion feedback message
        let completionMessage: string;
        if (finalCorrectCount === totalQuestions) {
          completionMessage = `Amazing! You got all ${totalQuestions} questions right! You're ready to dive into the lesson.`;
        } else if (finalCorrectCount > 0) {
          completionMessage = `Nice effort! You got ${finalCorrectCount} out of ${totalQuestions} correct. Let's watch the lesson to strengthen your understanding.`;
        } else {
          completionMessage = `No worries! The warmup helps identify areas to focus on. Let's watch the lesson together.`;
        }

        let feedbackMessageId: string | undefined;
        if (addAssistantMessageRef.current) {
          feedbackMessageId = await addAssistantMessageRef.current(
            completionMessage,
            "general"
          );
        }

        // Show warmup complete action buttons anchored to feedback message
        if (showActionRef.current) {
          showActionRef.current("warmup_complete", {}, feedbackMessageId);
        }
      }
    },
    [
      warmupState,
      activeLesson?.id,
      userId,
      markWarmupAnswered,
      addWarmupFeedback,
      addWarmupQuestion,
    ]
  );

  // Handler for warmup question skip
  const handleWarmupSkip = useCallback(
    async (questionId: string) => {
      console.log("[ModuleContent] Warmup question skipped:", questionId);

      if (!warmupState.isActive) {
        console.warn("[ModuleContent] No active warmup");
        return;
      }

      const messageId = warmupState.messageIds.get(questionId);
      if (messageId) {
        markWarmupSkipped(messageId);
      }

      // Record skipped attempt in DB
      if (activeLesson?.id) {
        await recordAttempt({
          odataUserId: userId,
          lessonId: activeLesson.id,
          assessmentType: "warmup",
          questionId,
          answer: null,
          isCorrect: null,
          isSkipped: true,
          feedback: null,
        });
      }

      // Check if there are more questions
      const nextIndex = warmupState.currentIndex + 1;
      if (nextIndex < warmupState.questions.length) {
        // Add next question
        const nextQuestion = warmupState.questions[nextIndex];
        const nextMessageId = addWarmupQuestion({
          id: nextQuestion.id,
          question: nextQuestion.question,
          options: nextQuestion.options,
          correctOption: nextQuestion.correct_option,
        });

        if (nextMessageId) {
          setWarmupState((prev) => {
            const newMessageIds = new Map(prev.messageIds);
            newMessageIds.set(nextQuestion.id, nextMessageId);
            return {
              ...prev,
              currentIndex: nextIndex,
              messageIds: newMessageIds,
              skippedCount: prev.skippedCount + 1,
            };
          });
        }
      } else {
        // Warmup complete (skipped last question)
        console.log("[ModuleContent] Warmup complete (skipped)!");
        const totalQuestions = warmupState.questions.length;
        const finalCorrectCount = warmupState.correctCount;
        const finalSkippedCount = warmupState.skippedCount + 1;

        setWarmupState({
          isActive: false,
          questions: [],
          currentIndex: 0,
          messageIds: new Map(),
          correctCount: 0,
          incorrectCount: 0,
          skippedCount: 0,
        });

        // Add completion feedback message
        let completionMessage: string;
        if (finalCorrectCount === totalQuestions) {
          completionMessage = `Amazing! You got all ${totalQuestions} questions right! You're ready to dive into the lesson.`;
        } else if (finalCorrectCount > 0) {
          completionMessage = `Nice effort! You got ${finalCorrectCount} out of ${totalQuestions} correct${finalSkippedCount > 0 ? ` (${finalSkippedCount} skipped)` : ""}. Let's watch the lesson to strengthen your understanding.`;
        } else if (finalSkippedCount === totalQuestions) {
          completionMessage = `No problem! Let's watch the lesson and you can always try the warmup questions later.`;
        } else {
          completionMessage = `No worries! The warmup helps identify areas to focus on. Let's watch the lesson together.`;
        }

        let feedbackMessageId: string | undefined;
        if (addAssistantMessageRef.current) {
          feedbackMessageId = await addAssistantMessageRef.current(
            completionMessage,
            "general"
          );
        }

        // Show warmup complete action buttons anchored to feedback message
        if (showActionRef.current) {
          showActionRef.current("warmup_complete", {}, feedbackMessageId);
        }
      }
    },
    [
      warmupState,
      activeLesson?.id,
      userId,
      markWarmupSkipped,
      addWarmupQuestion,
    ]
  );

  // Wrapper for addUserMessage that also sets the flag to track user interaction
  // This prevents welcome messages from being stored - only user messages and responses
  const handleAddUserMessage = useCallback(
    async (message: string, messageType = "general", inputType = "text") => {
      console.log(
        "[ModuleContent] User sent message, setting userHasSentMessageRef = true, messageType:",
        messageType
      );
      userHasSentMessageRef.current = true; // Mark that user has interacted
      lastUserMessageTypeRef.current = messageType; // Track message type for agent response
      // Dismiss any pending action buttons when user sends a message
      if (dismissActionRef.current) {
        dismissActionRef.current();
      }
      await addUserMessage(message, messageType, inputType);
    },
    [addUserMessage]
  );

  // Keep handleAddUserMessageRef updated for use in onUserMessage callback
  useEffect(() => {
    handleAddUserMessageRef.current = handleAddUserMessage;
  }, [handleAddUserMessage]);

  // Handler for in-lesson MCQ/text answers
  const handleInlessonAnswer = useCallback(
    async (questionId: string, answer: string) => {
      console.log("[ModuleContent] In-lesson answer received:", {
        questionId,
        answer,
      });

      if (
        !activeInlessonQuestion ||
        activeInlessonQuestion.questionId !== questionId
      ) {
        console.warn("[ModuleContent] No active question or ID mismatch");
        return;
      }

      const { messageId, type, correctOption } = activeInlessonQuestion;

      if (type === "mcq") {
        const isCorrect = answer === correctOption;
        const feedback = isCorrect
          ? "Great job! You got it right."
          : "That's not quite right, but don't worry - keep learning!";

        if (isCorrect) {
          audioManager?.play("success");
          fireConfetti();
          setShowSuccessToast(true);
          setTimeout(() => setShowSuccessToast(false), 900);
        } else {
          audioManager?.play("error");
          setShowErrorToast(true);
          setTimeout(() => setShowErrorToast(false), 900);
        }

        markInlessonAnswered(messageId);

        if (activeLesson?.id) {
          await recordAttempt({
            odataUserId: userId,
            lessonId: activeLesson.id,
            assessmentType: "inlesson",
            questionId,
            answer,
            isCorrect,
            isSkipped: false,
            feedback,
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 900));

        const feedbackMessageId = addInlessonFeedback(isCorrect, feedback);

        if (showActionRef.current) {
          showActionRef.current("inlesson_complete", {}, feedbackMessageId);
        }

        setActiveInlessonQuestion(null);
      } else {
        // Text: Send to agent for evaluation
        console.log(
          "[ModuleContent] Sending text answer to agent for evaluation"
        );

        // Mark question as answered
        markInlessonAnswered(messageId);

        // Send to agent via LiveKit
        if (liveKit.isConnected && liveKit.sendTextToAgent) {
          try {
            await liveKit.sendTextToAgent(
              `INLESSON_ANSWER:${questionId}:${answer}`
            );
          } catch (err) {
            console.error(
              "[ModuleContent] Failed to send in-lesson answer:",
              err
            );
          }
        }

        // Clear active question (agent will handle feedback)
        setActiveInlessonQuestion(null);
      }
    },
    [
      activeInlessonQuestion,
      activeLesson?.id,
      userId,
      markInlessonAnswered,
      addInlessonFeedback,
      liveKit.isConnected,
      liveKit.sendTextToAgent,
    ]
  );

  // Handler for in-lesson question skip
  const handleInlessonSkip = useCallback(
    async (questionId: string) => {
      console.log("[ModuleContent] In-lesson question skipped:", questionId);

      if (
        !activeInlessonQuestion ||
        activeInlessonQuestion.questionId !== questionId
      ) {
        console.warn("[ModuleContent] No active question or ID mismatch");
        return;
      }

      const { messageId } = activeInlessonQuestion;

      // Mark question as skipped
      markInlessonSkipped(messageId);

      // Record skipped attempt in DB
      if (activeLesson?.id) {
        await recordAttempt({
          odataUserId: userId,
          lessonId: activeLesson.id,
          assessmentType: "inlesson",
          questionId,
          answer: null,
          isCorrect: null,
          isSkipped: true,
          feedback: null,
        });
      }

      // Show "Continue watching" button
      if (showActionRef.current) {
        showActionRef.current("inlesson_complete", {
          introMessage: "Question skipped. Let's continue with the video.",
        });
      }

      // Clear active question
      setActiveInlessonQuestion(null);
    },
    [activeInlessonQuestion, activeLesson?.id, userId, markInlessonSkipped]
  );

  // Set up action button dependencies and hook
  const actionDeps: ActionDependencies = {
    seekTo,
    playVideo: () => {
      setIsPanelClosed(false); // Ensure panel is visible when playing
      if (playerRef.current) {
        if (playerRef.current.playVideo) {
          playerRef.current.playVideo();
        } else if (playerRef.current.setState) {
          playerRef.current.setState(1); // PLAYING = 1
        }
      }
    },
    pauseVideo: () => {
      if (playerRef.current?.pauseVideo) {
        playerRef.current.pauseVideo();
      }
    },
    selectLesson: (lesson) => {
      // If already on this lesson, just play the video
      if (activeLesson?.id === lesson.id) {
        if (playerRef.current?.playVideo) {
          playerRef.current.playVideo();
        }
      } else {
        setSelectedLesson(lesson);
      }
    },
    sendTextToAgent: liveKit.sendTextToAgent,
    addUserMessage: handleAddUserMessage,
    startTour,
    startWarmup: handleInlineWarmup,
    getLastAssistantMessageId,
  };

  const {
    pendingAction,
    showAction,
    dismissAction,
    handleButtonClick,
    isActioned,
    resetHandledActions,
  } = useActionButtons(actionDeps);

  // Keep showActionRef updated for use in callbacks
  useEffect(() => {
    showActionRef.current = showAction;
  }, [showAction]);

  // Keep dismissActionRef updated for use in handleAddUserMessage
  useEffect(() => {
    dismissActionRef.current = dismissAction;
  }, [dismissAction]);

  useEffect(() => {
    resetHandledActions();
  }, [resetHandledActions]);

  // Trigger session type action when agent finishes welcome message
  useEffect(() => {
    // Debug logging
    console.log("[ModuleContent] Action trigger check:", {
      isAgentSpeaking: liveKit.isAgentSpeaking,
      isConnected: liveKit.isConnected,
      sessionType,
      pendingAction: pendingAction?.type,
      agentTranscript: liveKit.agentTranscript?.substring(0, 30),
      welcomeStored: welcomeStoredRef.current,
    });

    if (
      !liveKit.isAgentSpeaking &&
      liveKit.isConnected &&
      sessionType &&
      !pendingAction &&
      (liveKit.agentTranscript || welcomeStoredRef.current)
    ) {
      const sessionTypeToAction: Record<string, ActionType> = {
        course_welcome: "course_welcome",
        course_welcome_back: "course_welcome_back",
        lesson_welcome: "lesson_welcome",
        lesson_welcome_back: "lesson_welcome_back",
      };

      const actionType = sessionTypeToAction[sessionType];
      console.log("[ModuleContent] Showing action buttons for:", actionType);
      if (actionType) {
        const anchorMessageId = isReturningUserRef.current
          ? "welcome"
          : welcomeMessageIdRef.current &&
              !welcomeMessageIdRef.current.startsWith("assistant-")
            ? welcomeMessageIdRef.current
            : undefined;
        showAction(
          actionType,
          {
            introLesson: sortedLessons[0],
            firstLesson: sortedLessons[1] || sortedLessons[0],
            lastLesson: activeLesson,
            lastPosition: sessionLessonProgress?.lastPosition || 0,
            prevLessonTitle,
          },
          anchorMessageId
        );
      }
    }
  }, [
    liveKit.isAgentSpeaking,
    liveKit.isConnected,
    liveKit.agentTranscript,
    sessionType,
    pendingAction,
    showAction,
    sortedLessons,
    activeLesson,
    sessionLessonProgress?.lastPosition,
    prevLessonTitle,
  ]);

  // Handle lesson selection
  const handleLessonSelect = useCallback((lesson: Lesson) => {
    setIsPanelClosed(false); // Reset closed state when selecting a lesson
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
        ? module.lessons.find(
            (lesson) => lesson.youtubeVideoId === youtubeVideoId
          )
        : null;

      // Check if this lesson is already selected (avoid re-render)
      const isAlreadySelected =
        matchingLesson && activeLesson?.id === matchingLesson.id;

      if (isAlreadySelected) {
        // Same lesson already selected - just seek, don't re-render
        seekTo(seconds);
        console.log(`Same lesson already playing. Seeking to ${seconds}s`);
      } else if (matchingLesson) {
        // Different lesson - select it with offset
        console.log(
          `Found matching lesson: ${matchingLesson.title}, selecting with offset ${seconds}s`
        );
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
        console.log(
          `Player not ready. Stored ${seconds} seconds as start offset.`
        );
      }
    },
    [module.lessons, activeLesson?.id, isPlayerReady, seekTo]
  );

  // Layout sections
  const header = (
    <LessonHeader courseTitle={course.title} moduleTitle={module.title} />
  );

  const content = (
    <div className="space-y-6 pb-3">
      {/* AI Welcome Agent */}
      <ChatAgent
        agentTranscript={liveKit.agentTranscript}
        chatMessages={chatMessages}
        course={course}
        hasSelectedLesson={!!activeLesson}
        isActionDisabled={isActioned}
        isAgentSpeaking={liveKit.isAgentSpeaking}
        isLiveKitConnected={liveKit.isConnected}
        isReturningUser={isReturningUser}
        isUserSpeaking={liveKit.isUserSpeaking}
        isVideoPlaying={isPlaying}
        // LiveKit agent transcript
        isVoiceModeEnabled={liveKit.isVoiceModeEnabled}
        isWaitingForResponse={isSending || liveKit.isWaitingForAgentResponse}
        module={module}
        onActionButtonClick={handleButtonClick}
        // LiveKit functions for FA answers
        onAddUserMessage={handleAddUserMessage}
        onConversationReady={handleConversationReady}
        // Voice mode state for user speech display
        onInlessonAnswer={handleInlessonAnswer}
        onInlessonSkip={handleInlessonSkip}
        onLessonSelect={handleLessonSelect}
        // Action buttons (unified pattern for all action types)
        onTimestampClick={handleTimestampClick}
        onWarmupAnswer={handleWarmupAnswer}
        onWarmupSkip={handleWarmupSkip}
        // In-lesson question handlers
        pendingAction={pendingAction}
        sendTextToAgent={liveKit.sendTextToAgent}
        // Warmup question handlers (inline in chat)
        userId={userId}
        userTranscript={liveKit.userTranscript}
      />

      {/* Module Lessons Overview - Removed as not needed */}
    </div>
  );

  const footer = (
    <ChatInput
      conversationId={conversationId || undefined}
      courseId={course.id}
      isLoading={isSending}
      liveKitState={liveKit}
      onAddUserMessage={handleAddUserMessage}
      placeholder="Ask me anything about this lesson..."
      userId={userId}
      // Pass LiveKit state from parent (auto-connected session)
      videoIds={videoIds}
    />
  );

  // Handle closing the right panel (video player)
  const handleCloseRightPanel = useCallback(() => {
    setIsPanelClosed(true); // Mark panel as explicitly closed
    setSelectedLesson(null);
    // Also update URL to remove the lesson param so clicking on lessons works again
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  const rightPanel =
    !isPanelClosed && activeLesson?.kpointVideoId ? (
      <div
        className={`flex h-full flex-col bg-white p-4 transition-all duration-300 ${
          highlightRightPanel
            ? "bg-purple-50 ring-5 ring-purple-500 ring-opacity-75"
            : ""
        }`}
        data-tour="video-panel"
      >
        {/* Video Card */}
        <div
          className={`relative overflow-hidden rounded-2xl border-2 bg-background shadow-xl transition-all duration-300 ${
            highlightRightPanel
              ? "scale-[1.02] border-purple-400 shadow-purple-300/60"
              : "border-blue-200 hover:border-blue-400 hover:shadow-blue-300/40"
          }`}
        >
          {/* Close Button - positioned on top of video */}
          <button
            className="absolute top-3 right-3 z-10 cursor-pointer rounded-xl bg-gray-900/80 p-2 text-white shadow-lg transition-colors hover:bg-gray-900"
            onClick={handleCloseRightPanel}
            title="Close video panel"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Video Player */}
          <div className="aspect-video">
            <KPointVideoPlayer
              kpointVideoId={activeLesson.kpointVideoId}
              startOffset={effectiveStartOffset}
            />
          </div>
          {/* Lesson Title Below Video */}
          <div className="p-3">
            <h3 className="line-clamp-2 font-medium text-foreground text-xs">
              Lesson {activeLesson.orderIndex + 1}: {activeLesson.title}
            </h3>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <>
      <AnimatedBackground intensity="medium" theme="learning" variant="full" />
      <OnboardingModal isReturningUser={isReturningUser} />
      <Script
        src="https://assets.zencite.in/orca/media/embed/videofront-vega.js"
        strategy="afterInteractive"
      />
      <ResizableContent
        content={content}
        footer={footer}
        header={header}
        rightPanel={rightPanel}
      />
      <QuizOverlay
        currentQuestionIndex={assessmentQuiz.currentQuestionIndex}
        isLoading={assessmentQuiz.isLoading}
        isOpen={assessmentQuiz.isOpen}
        lastAnswer={assessmentQuiz.lastAnswer}
        onClose={assessmentQuiz.close}
        onContinue={assessmentQuiz.continueQuiz}
        onSkipQuestion={assessmentQuiz.skipQuestion}
        onSubmitAnswer={assessmentQuiz.submitAnswer}
        questions={assessmentQuiz.questions}
        quizType={assessmentQuiz.quizType || "warmup"}
        showFeedback={assessmentQuiz.showFeedback}
      />
      <SuccessMessage
        onClose={() => setShowSuccessToast(false)}
        show={showSuccessToast}
      />
      <ErrorMessage
        onClose={() => setShowErrorToast(false)}
        show={showErrorToast}
      />
    </>
  );
}
