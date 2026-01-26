"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Script from "next/script";
import { ResizableContent } from "@/components/layout/resizable-content";
import { LessonHeader } from "@/components/course/LessonHeader";
import { ChatAgent } from "@/components/agent/ChatAgent";
import { ChatInput } from "@/components/chat/ChatInput";
import { KPointVideoPlayer } from "@/components/video/KPointVideoPlayer";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { SuccessMessage } from "@/components/feedback/SuccessMessage";
import { ErrorMessage } from "@/components/feedback/ErrorMessage";
import { X } from "lucide-react";
import { toast } from "sonner";
import { mockTourData } from "@/lib/mockTourData";
import { useTour } from "@/hooks/useTour";
import { MessageBubble } from "@/components/ui/message-bubble";
import { QuizOverlay } from "@/components/assessment/QuizOverlay";
import { audioManager } from "@/lib/audio/quizAudio";
import { fireConfetti } from "@/components/ui/confetti";

// Hooks
import { useKPointPlayer } from "@/hooks/useKPointPlayer";
import { useAssessmentQuiz } from "@/hooks/useAssessmentQuiz";
import { useChatSession, type AddAssistantMessageOptions } from "@/hooks/useChatSession";
import { useLiveKit, TranscriptSegment, UserTranscription } from "@/hooks/useLiveKit";
import { useSessionType } from "@/hooks/useSessionType";
import { useWelcome } from "@/hooks/useWelcome";
import { useLearningPanel } from "@/contexts/LearningPanelContext";
import { useAudioContext } from "@/contexts/AudioContext";
import { ActionsProvider, useActions } from "@/contexts/ActionsContext";
import { useTTS } from "@/hooks/useTTS";
import type { ActionType } from "@/lib/actions/actionRegistry";

/**
 * V2 Action Handler Registry
 * Registers action handlers when mounted inside ActionsProvider
 */
interface ActionHandlerRegistryProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  playerRef: React.RefObject<{ playVideo?: () => void; pauseVideo?: () => void } | null>;
  seekTo: (time: number) => void;
  setSelectedLesson: (lesson: Lesson | null) => void;
  activeLesson: Lesson | null;
  sortedLessons: Lesson[];
  router: ReturnType<typeof useRouter>;
  courseId: string;
  startWarmup: () => void;
  startTour: () => void;
  // For FA intro handlers
  addUserMessage: (message: string, messageType?: string, inputType?: string) => Promise<void>;
  sendTextToAgent: (text: string) => Promise<void>;
}

function ActionHandlerRegistry({
  playerRef,
  seekTo,
  setSelectedLesson,
  activeLesson,
  sortedLessons,
  router,
  courseId,
  startWarmup,
  startTour,
  addUserMessage,
  sendTextToAgent,
}: ActionHandlerRegistryProps) {
  const { registerHandler, unregisterHandler } = useActions();

  // Register all handlers on mount
  useEffect(() => {
    // Helper to find next lesson
    const findNextLesson = () => {
      if (!activeLesson) return null;
      const currentIndex = sortedLessons.findIndex((l) => l.id === activeLesson.id);
      return currentIndex >= 0 && currentIndex < sortedLessons.length - 1
        ? sortedLessons[currentIndex + 1]
        : null;
    };

    // Course welcome handlers
    registerHandler("course_welcome", "see_intro", (meta) => {
      const introLesson = meta.introLesson as Lesson;
      if (introLesson) setSelectedLesson(introLesson);
    });

    registerHandler("course_welcome", "skip_to_lesson", (meta) => {
      const firstLesson = meta.firstLesson as Lesson;
      if (firstLesson) setSelectedLesson(firstLesson);
    });

    registerHandler("course_welcome", "take_tour", () => {
      startTour();
    });

    // Course welcome back handlers
    registerHandler("course_welcome_back", "continue", (meta) => {
      const lastLesson = meta.lastLesson as Lesson;
      if (lastLesson) setSelectedLesson(lastLesson);
      setTimeout(() => {
        const pos = meta.lastPosition as number;
        if (pos) seekTo(pos);
        playerRef.current?.playVideo?.();
      }, 500);
    });

    registerHandler("course_welcome_back", "take_tour", () => {
      startTour();
    });

    // Video control handlers
    registerHandler("inlesson_complete", "continue_video", () => {
      playerRef.current?.playVideo?.();
    });

    registerHandler("warmup_complete", "watch_lesson", () => {
      playerRef.current?.playVideo?.();
    });

    registerHandler("lesson_welcome", "skip", () => {
      playerRef.current?.playVideo?.();
    });

    registerHandler("lesson_welcome_back", "continue", (meta) => {
      const pos = meta.lastPosition as number;
      if (pos) seekTo(pos);
      playerRef.current?.playVideo?.();
    });

    registerHandler("lesson_welcome_back", "restart", () => {
      seekTo(0);
      playerRef.current?.playVideo?.();
    });

    // Navigation handlers
    registerHandler("intro_complete", "continue_to_lesson1", (meta) => {
      const nextLesson = meta.nextLesson as Lesson & { moduleId?: string };
      const metaCourseId = meta.courseId as string;
      if (nextLesson && metaCourseId) {
        const targetModuleId = nextLesson.moduleId || module.id;
        setSelectedLesson(nextLesson);
        router.push(`/course/${metaCourseId}/module/${targetModuleId}?lesson=${nextLesson.id}`);
      }
    });

    registerHandler("lesson_complete", "next_lesson", (meta) => {
      const nextLesson = meta.nextLesson as Lesson & { moduleId?: string };
      if (nextLesson) {
        const targetModuleId = nextLesson.moduleId || module.id;
        setSelectedLesson(nextLesson);
        router.push(`/course/${courseId}/module/${targetModuleId}?lesson=${nextLesson.id}`);
      }
    });

    registerHandler("lesson_complete", "assessment", async (meta) => {
      await addUserMessage("Take assessment on this lesson", "fa", "auto");
      const lessonTitle = (meta.lessonTitle as string) || "this lesson";
      const lessonDescription = (meta.lessonDescription as string) || "the topics covered";
      const assessmentPrompt = `Start a Formative assessment on "${lessonTitle}". Topics covered: ${lessonDescription}. Ask 5 questions covering the main topics.`;
      console.log("[ActionHandler] Sending assessment prompt to agent:", assessmentPrompt);
      await sendTextToAgent(assessmentPrompt);
    });

    // Warmup handlers
    registerHandler("lesson_welcome", "start_warmup", () => {
      startWarmup();
    });

    // FA intro handlers
    registerHandler("fa_intro", "start", async (meta) => {
      // Display user message in chat UI
      await addUserMessage("Ask me a formative assessment", "fa", "auto");
      // Send FA request to agent
      const topic = meta.topic as string;
      const agentMessage = `
        Be in assessment mode.

        Generate EXACTLY 3 questions on ${topic} (use mixed question types if needed).
        Ask questions one by one.
        If the user answers 2 questions correctly, stop the assessment and provide feedback.

        IMPORTANT:
        - Do NOT tell the user about the 3 question limit or the 2 correct answers threshold.
        - Do NOT mention "I will ask 3 questions" or similar.
        - Just start with the first question naturally.
        - Give answer explanation in strictly 2 sentences.

        User query: Ask me a formative assessment on "${topic}".
      `.trim();
      await sendTextToAgent(agentMessage);
    });

    registerHandler("fa_intro", "skip", () => {
      playerRef.current?.playVideo?.();
    });

    // Cleanup
    return () => {
      const handlers: Array<[ActionType, string]> = [
        ["course_welcome", "see_intro"],
        ["course_welcome", "skip_to_lesson"],
        ["course_welcome", "take_tour"],
        ["course_welcome_back", "continue"],
        ["course_welcome_back", "take_tour"],
        ["inlesson_complete", "continue_video"],
        ["warmup_complete", "watch_lesson"],
        ["lesson_welcome", "skip"],
        ["lesson_welcome_back", "continue"],
        ["lesson_welcome_back", "restart"],
        ["intro_complete", "continue_to_lesson1"],
        ["lesson_complete", "next_lesson"],
        ["lesson_complete", "assessment"],
        ["lesson_welcome", "start_warmup"],
        ["fa_intro", "start"],
        ["fa_intro", "skip"],
      ];
      for (const [actionType, buttonId] of handlers) {
        unregisterHandler(actionType, buttonId);
      }
    };
  }, [
    registerHandler,
    unregisterHandler,
    playerRef,
    seekTo,
    setSelectedLesson,
    activeLesson,
    sortedLessons,
    router,
    courseId,
    startWarmup,
    startTour,
    addUserMessage,
    sendTextToAgent,
  ]);

  return null; // This component doesn't render anything
}
import { getLessonProgress } from "@/lib/actions/lesson-progress";
import { useActionButtons } from "@/hooks/useActionButtons";
import type { ActionDependencies } from "@/lib/actions/actionHandlers";
import type { LessonQuiz, WarmupQuestion } from "@/types/assessment";
import { recordAttempt, getAnsweredQuestionIds } from "@/lib/actions/assessment";

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

export function ModuleContent({ course, module, userId, initialLessonId, initialPanelOpen = false, isTourMode = false }: ModuleContentProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Get panel state and controls from context (needed for both modes)
  const { highlightRightPanel, collapsePanel, expandPanel } = useLearningPanel();

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
              key={message.id}
              type={message.type}
              content={message.content}
              enableAnimation={false}
            />
          ))}
        </div>
      </div>
    );

    const tourFooter = (
      <ChatInput
        placeholder="Ask me anything about this lesson..."
        onAddUserMessage={() => {}} // No-op in tour mode
        isLoading={false}
        conversationId={undefined}
        courseId={course.id}
        userId={userId}
        videoIds={[]}
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
      />
    );

    const tourRightPanel = (
      <div className="tour-video-panel h-full flex flex-col bg-white p-4">
        <div className="bg-background rounded-2xl shadow-xl overflow-hidden border-2 border-blue-200">
          <div className="aspect-video bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">🎥</div>
              <div className="text-lg font-semibold text-gray-700">
                {mockTourData.videoPlaceholder.title}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {mockTourData.videoPlaceholder.description}
              </div>
            </div>
          </div>
          <div className="p-3">
            <h3 className="font-medium text-xs text-foreground">
              {mockTourData.videoPlaceholder.title}
            </h3>
          </div>
        </div>
      </div>
    );

    return (
      <>
        <AnimatedBackground variant="full" intensity="medium" theme="learning" />
        <ResizableContent
          header={tourHeader}
          content={tourContent}
          footer={tourFooter}
          rightPanel={tourRightPanel}
        />
      </>
    );
  }

  // Get audio context for mute state and callback registration
  const { isMuted: isAudioMuted, registerMuteCallback, unregisterMuteCallback } = useAudioContext();

  // TTS for warmup and in-lesson questions
  const { speak: speakTTS } = useTTS();

  // Find initial lesson from URL parameter or default to null (will show first lesson)
  const getInitialLesson = (): Lesson | null => {
    if (initialLessonId) {
      const lesson = module.lessons.find((l) => l.id === initialLessonId);
      return lesson || null;
    }
    return null;
  };

  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(getInitialLesson);
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
  const sortedLessons = [...module.lessons].sort((a, b) => a.orderIndex - b.orderIndex);
  const activeLesson = selectedLesson || sortedLessons[0];

  // Fetch lesson progress when lesson is selected
  useEffect(() => {
    if (!activeLesson || !userId) {
      setLessonProgress(null);
      return;
    }

    async function fetchProgress() {
      try {
        const progress = await getLessonProgress(userId, activeLesson!.id);
        setLessonProgress(progress);
      } catch (error) {
        console.error("Failed to fetch lesson progress:", error);
        setLessonProgress(null);
      }
    }

    fetchProgress();
  }, [activeLesson?.id, userId]);

  // Collapse left panel when video panel opens, expand when closed
  useEffect(() => {
    if (activeLesson?.kpointVideoId) {
      collapsePanel();
    } else {
      expandPanel();
    }
  }, [activeLesson?.kpointVideoId, collapsePanel, expandPanel]);

  // Use youtubeVideoId for Sarvam AI (video context), kpointVideoId for player
  const videoIds = activeLesson?.youtubeVideoId ? [activeLesson.youtubeVideoId] : [];

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

  // Track if welcome message has been stored (for first-time users only)
  // Moved here to be available in useWelcome's onComplete callback
  const welcomeStoredRef = useRef<boolean>(false);

  // Direct welcome flow (without LiveKit dependency)
  // Generates LLM welcome message and plays TTS directly
  const {
    welcomeMessage: directWelcomeMessage,
    isPlaying: isWelcomePlaying,
    isComplete: welcomeComplete,
  } = useWelcome(
    sessionType,
    {
      userName: undefined, // TODO: Get user name from session
      courseTitle: course.title,
      courseDescription: course.description ?? undefined,
      learningObjectives: course.learningObjectives?.join(", "),
      lessonTitle: activeLesson?.title,
      lessonNumber,
      prevLessonTitle: prevLessonTitle ?? undefined,
      completedLessons: courseProgress?.completedLessons,
      totalLessons: courseProgress?.totalLessons,
      lastLessonTitle: courseProgress?.lastLessonTitle ?? undefined,
      completionPercentage: sessionLessonProgress?.completionPercentage,
      lastPosition: sessionLessonProgress?.lastPosition,
    },
    {
      enabled: !isTourMode && !!sessionType && !isSessionTypeLoading,
      onComplete: async (message: string) => {
        console.log("[ModuleContent] Direct welcome flow complete - storing message with action");
        // Guard: prevent duplicate welcome messages
        if (welcomeStoredRef.current) {
          console.log("[ModuleContent] Welcome already stored, skipping");
          return;
        }
        // Store the welcome message with action attached for V2 button rendering
        if (addAssistantMessageRef.current && message && sessionType) {
          const sessionTypeToAction: Record<string, ActionType> = {
            course_welcome: "course_welcome",
            course_welcome_back: "course_welcome_back",
            lesson_welcome: "lesson_welcome",
            lesson_welcome_back: "lesson_welcome_back",
          };

          const actionType = sessionTypeToAction[sessionType];
          if (actionType) {
            welcomeStoredRef.current = true; // Mark as stored BEFORE async call
            await addAssistantMessageRef.current(message, {
              messageType: "general",
              action: actionType,
              actionMetadata: {
                introLesson: sortedLessons[0],
                firstLesson: sortedLessons[1] || sortedLessons[0],
                lastLesson: activeLesson,
                lastPosition: sessionLessonProgress?.lastPosition || 0,
                prevLessonTitle,
              },
            });
            console.log("[ModuleContent] Welcome message stored with action:", actionType);
          }
        }
      },
    }
  );

  // Ref for sendTextToAgent to use in assessment quiz (set after useLiveKit)
  const sendTextToAgentRef = useRef<((message: string) => Promise<void>) | null>(null);

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
  // welcomeStoredRef moved earlier (before useWelcome) to be available in onComplete callback
  const welcomeMessageIdRef = useRef<string | undefined>(undefined);
  // Ref for isReturningUser to use in callback
  const isReturningUserRef = useRef<boolean>(isReturningUser);
  // Ref for addAssistantMessage to use in callback (set after useChatSession)
  // V2: Updated type to support action options
  const addAssistantMessageRef = useRef<((message: string, options?: AddAssistantMessageOptions | string) => Promise<string | undefined>) | null>(null);
  // Ref for clearAgentTranscript to use in callback (set after useLiveKit)
  const clearAgentTranscriptRef = useRef<(() => void) | null>(null);
  // Ref for handleAddUserMessage to use in onUserMessage callback (set after useChatSession)
  const handleAddUserMessageRef = useRef<((message: string, messageType?: string, inputType?: string) => Promise<void>) | null>(null);
  // Ref for clearUserTranscript to use after storing voice message
  const clearUserTranscriptRef = useRef<(() => void) | null>(null);
  // Ref for dismissAction to use in handleAddUserMessage (set after useActionButtons)
  const dismissActionRef = useRef<(() => void) | null>(null);
  // Refs for in-lesson question functions (set after useChatSession)
  const addInlessonQuestionRef = useRef<((question: {
    id: string;
    question: string;
    type: "mcq" | "text";
    options?: { id: string; text: string }[];
    correctOption?: string;
  }) => string | null) | null>(null);
  const markInlessonAnsweredRef = useRef<((messageId: string) => void) | null>(null);
  const markInlessonSkippedRef = useRef<((messageId: string) => void) | null>(null);
  const addInlessonFeedbackRef = useRef<((isCorrect: boolean, feedback: string) => string | undefined) | null>(null);
  const setActiveInlessonQuestionRef = useRef<((question: {
    questionId: string;
    messageId: string;
    type: "mcq" | "text";
    correctOption?: string;
  } | null) => void) | null>(null);

  // Refs for warmup question functions (set after useChatSession)
  const addWarmupQuestionRef = useRef<((question: {
    id: string;
    question: string;
    options?: { id: string; text: string }[];
    correctOption?: string;
  }) => string | null) | null>(null);
  const markWarmupAnsweredRef = useRef<((messageId: string, userAnswer?: string) => void) | null>(null);
  const markWarmupSkippedRef = useRef<((messageId: string) => void) | null>(null);
  const addWarmupFeedbackRef = useRef<((isCorrect: boolean, feedback: string) => string | undefined) | null>(null);

  // State for tracking active warmup flow
  const [warmupState, setWarmupState] = useState<{
    isActive: boolean;
    questions: WarmupQuestion[];
    currentIndex: number;
    messageIds: Map<string, string>; // questionId -> messageId
    correctCount: number;
    incorrectCount: number;
    skippedCount: number;
  }>({ isActive: false, questions: [], currentIndex: 0, messageIds: new Map(), correctCount: 0, incorrectCount: 0, skippedCount: 0 });

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

      if (!segment.isAgent || !segment.text.trim()) {
        return;
      }

      // Handle FA intro transcript to show buttons
      if (segment.text.startsWith("We've just completed a full idea covering")) {
        if (segment.isFinal) {
          const text = segment.text;
          const topicRegex = /covering ([^.]+)\. Let's do a quick check/;
          const match = text.match(topicRegex);
          if (match && match[1]) {
            const topic = match[1];
            console.log("[ModuleContent] FA intro transcript detected, showing buttons for topic:", topic);

          // V2: Add message with action attached
          if (addAssistantMessageRef.current) {
            console.log("[ModuleContent] FA intro - adding message with action", { topic });
            await addAssistantMessageRef.current(text, {
              messageType: "fa",
              action: "fa_intro",
              actionMetadata: { topic, introMessage: text },
              tts:true
            });
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
        if (!userHasSentMessageRef.current && !welcomeStoredRef.current) {
          if (!isReturningUserRef.current) {
            // First-time user: Store the welcome message in DB
            if (addAssistantMessageRef.current) {
              storedSegmentsRef.current.add(segmentKey);
              welcomeStoredRef.current = true;
              console.log("[ModuleContent] Storing welcome message for first-time user:", segment.text.substring(0, 50) + "...");
              const savedMessageId = await addAssistantMessageRef.current(segment.text, "general");
              welcomeMessageIdRef.current = savedMessageId;
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
  // V2: Add message with action attached
  const handleFAIntroComplete = useCallback(async (data: { topic: string; introMessage: string }) => {
    console.log("[ModuleContent] FA intro complete, showing buttons for topic:", data.topic);

    // V2: Save the FA intro message with action attached
    if (data.introMessage && addAssistantMessageRef.current) {
      await addAssistantMessageRef.current(data.introMessage, {
        messageType: "fa",
        action: "fa_intro",
        actionMetadata: { topic: data.topic, introMessage: data.introMessage },
        tts:true
      });
    }
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
      lessonNumber: lessonNumber, // 1-based global lesson number
      prevLessonTitle: prevLessonTitle ?? undefined, // Previous lesson title for warm-up context (from API)
      // New session type system: course_welcome | course_welcome_back | lesson_welcome | lesson_welcome_back
      sessionType: sessionType,
      isFirstCourseVisit: isFirstCourseVisit,
      isIntroLesson: isIntroLesson,
      isFirstLessonVisit: isFirstLessonVisit,
      // Course progress for welcome_back messages
      courseProgress: courseProgress ? JSON.stringify(courseProgress) : undefined,
      // Lesson progress for lesson_welcome_back messages
      lessonProgressData: sessionLessonProgress ? JSON.stringify(sessionLessonProgress) : undefined,
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
    if (!liveKit.isConnected) return;

    // Sync initial mute state when LiveKit connects
    const initialMuted = isAudioMutedRef.current;
    console.log("[ModuleContent] LiveKit connected, syncing initial mute state:", initialMuted);
    liveKit.setAudioOutputEnabled(!initialMuted).catch((err) => {
      console.warn("[ModuleContent] Failed to sync initial mute state:", err);
    });

    // Register callback for future mute state changes
    const handleMuteChange = (muted: boolean) => {
      console.log("[ModuleContent] AudioContext mute changed:", muted);
      liveKit.setAudioOutputEnabled(!muted).catch((err) => {
        console.warn("[ModuleContent] Failed to sync audio output with mute state:", err);
      });
    };

    registerMuteCallback(handleMuteChange);
    console.log("[ModuleContent] Registered mute callback for LiveKit audio output");

    return () => {
      unregisterMuteCallback(handleMuteChange);
      console.log("[ModuleContent] Unregistered mute callback");
    };
  }, [liveKit.isConnected, liveKit.setAudioOutputEnabled, registerMuteCallback, unregisterMuteCallback]);

  const lastVideoEndRef = useRef<{ lessonId: string | null; timestamp: number } | null>(null);

  // Handle video end - auto-play next lesson
  const handleVideoEnd = useCallback(async () => {
    const lessonId = activeLesson?.id ?? null;
    if (lessonId) {
      const now = Date.now();
      const last = lastVideoEndRef.current;
      if (last && last.lessonId === lessonId && now - last.timestamp < 2000) {
        console.log("[ModuleContent] Duplicate video end ignored", {
          lessonId,
          deltaMs: now - last.timestamp,
        });
        return;
      }
      lastVideoEndRef.current = { lessonId, timestamp: now };
    }
    console.log("[ModuleContent] handleVideoEnd called", {
      activeLesson: activeLesson?.title,
      lessonsCount: module.lessons.length,
    });

    if (!activeLesson || !module.lessons.length) {
      console.log("[ModuleContent] handleVideoEnd early return - no active lesson or lessons");
      return;
    }

    // Sort lessons to find the next one
    const sortedLessonsList = [...module.lessons].sort((a, b) => a.orderIndex - b.orderIndex);
    const currentIndex = sortedLessonsList.findIndex((l) => l.id === activeLesson.id);
    const hasNextLesson = currentIndex >= 0 && currentIndex < sortedLessonsList.length - 1;
    let nextLesson = hasNextLesson ? sortedLessonsList[currentIndex + 1] : null;

    console.log("[ModuleContent] Video end - lesson detection:", {
      isIntroLesson,
      currentIndex,
      totalLessons: sortedLessonsList.length,
      hasNextLesson,
      activeTitle: activeLesson.title,
      nextTitle: nextLesson?.title,
      allLessons: sortedLessonsList.map(l => ({ title: l.title, orderIndex: l.orderIndex }))
    });

    // If no next lesson in current module, try to get next module's first lesson
    if (!nextLesson) {
      console.log("[ModuleContent] No next lesson in module, fetching next module...");
      try {
        const response = await fetch(
          `/api/courses/${course.id}/next-module?currentModuleId=${module.id}`
        );
        const data = await response.json();

        if (data.success && data.hasNextModule && data.nextModule?.firstLesson) {
          nextLesson = {
            ...data.nextModule.firstLesson,
            moduleId: data.nextModule.id, // Store module ID for navigation
          };
          console.log("[ModuleContent] Found next module's first lesson:", nextLesson?.title, "in module:", data.nextModule.id);
        } else {
          console.log("[ModuleContent] No next module available");
        }
      } catch (err) {
        console.error("[ModuleContent] Failed to fetch next module:", err);
      }
    }

    // INTRO LESSON COMPLETION
    if (isIntroLesson) {
      console.log("[ModuleContent] Intro lesson video ended - showing completion flow");

      if (nextLesson) {
        // V2: Add AI message with action attached
        // V3: tts: true for automatic text-to-speech
        const completionMessage = "Great job on completing the Introduction! Before we move ahead, would you like to warm up your thinking muscles?";
        if (addAssistantMessageRef.current) {
          await addAssistantMessageRef.current(completionMessage, {
            messageType: "general",
            action: "intro_complete",
            actionMetadata: { nextLesson, courseId: course.id },
            tts: true,
          });
        }

        console.log("[ModuleContent] Intro complete flow triggered, next lesson:", nextLesson.title);
        return; // Prevent auto-advance
      } else {
        console.error("[ModuleContent] No next lesson found after intro");
        toast.error("Unable to find next lesson");
        return;
      }
    }

    // ALL OTHER LESSONS COMPLETION
    console.log("[ModuleContent] Regular lesson video ended - showing completion options");

    // V2: Create celebratory message with action attached
    // V3: tts: true for automatic text-to-speech
    const lessonTitle = activeLesson.title || "this lesson";
    const completionMessage = `Well done — you've completed ${lessonTitle} 👏\n\nWhat would you like to do next?`;

    if (addAssistantMessageRef.current) {
      await addAssistantMessageRef.current(completionMessage, {
        messageType: "general",
        action: "lesson_complete",
        actionMetadata: {
          nextLesson,
          courseId: course.id,
          lessonTitle: activeLesson.title,
          lessonDescription: activeLesson.description,
        }, // nextLesson may be null if last lesson
        tts: true,
      });
      console.log("[ModuleContent] V2: lesson_complete action added to message");
    } else {
      console.warn("[ModuleContent] addAssistantMessageRef.current is null - cannot add completion message");
    }

    console.log("[ModuleContent] Lesson complete flow triggered, has next:", !!nextLesson);
    return; // Prevent auto-advance
  }, [activeLesson, module.lessons, module.id, course.id, isIntroLesson]);

  // Get video duration from lesson (stored in seconds in database)
  const videoDuration = activeLesson?.duration || 0;

  // Calculate effective start offset (manual timestamp OR saved position for in_progress lessons)
  const effectiveStartOffset = videoStartOffset ??
    (lessonProgress?.status === "in_progress" ? lessonProgress.lastPosition : null);

  // KPoint player hook with FA trigger integration
  const { seekTo, getCurrentTime, isPlayerReady, isPlaying, playerRef } = useKPointPlayer({
    kpointVideoId: activeLesson?.kpointVideoId,
    userId,
    lessonId: activeLesson?.id,
    videoDuration,
    onVideoEnd: handleVideoEnd,
    quizData: (activeLesson?.quiz ?? null) as LessonQuiz | null,
    onInLessonTrigger: (questionId: string) => {
      // Find the question from quiz data
      const quizData = activeLesson?.quiz as LessonQuiz | null;
      const question = quizData?.inlesson?.find(q => q.id === questionId);

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

        // Speak the question immediately
        speakTTS(question.question);

        console.log("[ModuleContent] In-lesson question added to chat:", {
          messageId,
          questionId: question.id,
          type: question.type,
        });
      } else {
        console.warn("[ModuleContent] addInlessonQuestionRef not ready");
      }
    },
    onFATrigger: async (_message: string, _timestampSeconds: number, topic?: string, _pauseVideo?: boolean) => {
      // NEW FLOW: Instead of directly starting FA, first show intro with buttons
      // 1. Send FA_INTRO:topic to agent - agent speaks intro message
      // 2. Agent sends fa_intro_complete signal (or transcript callback detects it)
      // 3. Frontend shows "Start quick check" and "Skip for now" buttons via action registry
      // 4. User clicks button to either start FA or resume video

      if (liveKit.isConnected) {
        try {
          const topicName = topic || "the topic";
          const introMessage = `FA_INTRO:${topicName}`;
          console.log("[ModuleContent] FA trigger - sending intro request:", introMessage);
          await liveKit.sendTextToAgent(introMessage);
          // Buttons will be shown when agent finishes speaking (via handleFAIntroComplete or transcript callback)
        } catch (err) {
          console.error("[ModuleContent] Failed to send FA intro via LiveKit:", err);
        }
      } else {
        console.warn("[ModuleContent] LiveKit not connected, cannot send FA intro");
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
    // V2: Action support
    updateMessageAction,
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
  }, [addInlessonQuestion, markInlessonAnswered, markInlessonSkipped, addInlessonFeedback, setActiveInlessonQuestion]);

  // Keep warmup refs updated
  useEffect(() => {
    addWarmupQuestionRef.current = addWarmupQuestion;
    markWarmupAnsweredRef.current = markWarmupAnswered;
    markWarmupSkippedRef.current = markWarmupSkipped;
    addWarmupFeedbackRef.current = addWarmupFeedback;
  }, [addWarmupQuestion, markWarmupAnswered, markWarmupSkipped, addWarmupFeedback]);

  // Inline warmup handler - replaces popup-based assessmentQuiz.startWarmup
  const handleInlineWarmup = useCallback(async () => {
    const quizData = activeLesson?.quiz as LessonQuiz | null;
    if (!quizData?.warmup || quizData.warmup.length === 0 || !activeLesson?.id) {
      console.warn("[ModuleContent] No warmup questions available");
      return;
    }

    // Get already answered question IDs
    const answeredIds = await getAnsweredQuestionIds(userId, activeLesson.id, "warmup");

    // Filter out already answered questions
    const unansweredQuestions = quizData.warmup.filter(
      (q: WarmupQuestion) => !answeredIds.has(q.id)
    );

    if (unansweredQuestions.length === 0) {
      console.log("[ModuleContent] All warmup questions already answered");
      // V2: Add completion message with action attached
      if (addAssistantMessageRef.current) {
        await addAssistantMessageRef.current("Great! You've already completed the warm-up. Ready to watch the lesson?", {
          messageType: "general",
          action: "warmup_complete",
          actionMetadata: {},
          tts: true,
        });
      }
      return;
    }

    console.log("[ModuleContent] Starting inline warmup with", unansweredQuestions.length, "questions");

    // Add first question to chat
    const firstQuestion = unansweredQuestions[0];
    const messageId = addWarmupQuestion({
      id: firstQuestion.id,
      question: firstQuestion.question,
      options: firstQuestion.options,
      correctOption: firstQuestion.correct_option,
    });

    if (messageId) {
      // Speak the question immediately
      speakTTS(firstQuestion.question);

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
  }, [activeLesson?.quiz, activeLesson?.id, userId, addWarmupQuestion, speakTTS]);

  // Handler for warmup MCQ answers
  const handleWarmupAnswer = useCallback(
    async (questionId: string, answer: string) => {
      console.log("[ModuleContent] Warmup answer received:", { questionId, answer });

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
      const feedback = currentQuestion.feedback || (isCorrect
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
      await new Promise((resolve) => setTimeout(resolve, isCorrect ? 2500 : 2000));

      // Add feedback message and speak it
      addWarmupFeedback(isCorrect, feedback);
      speakTTS(feedback);

      // Check if there are more questions
      const nextIndex = warmupState.currentIndex + 1;
      if (nextIndex < warmupState.questions.length) {
        // Wait for feedback TTS to complete before adding next question
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const nextQuestion = warmupState.questions[nextIndex];
        const nextMessageId = addWarmupQuestion({
          id: nextQuestion.id,
          question: nextQuestion.question,
          options: nextQuestion.options,
          correctOption: nextQuestion.correct_option,
        });

        if (nextMessageId) {
          // Speak the next question
          speakTTS(nextQuestion.question, { interrupt: true });
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
        const finalCorrectCount = warmupState.correctCount + (isCorrect ? 1 : 0);
        const finalIncorrectCount = warmupState.incorrectCount + (isCorrect ? 0 : 1);

        setWarmupState({
          isActive: false,
          questions: [],
          currentIndex: 0,
          messageIds: new Map(),
          correctCount: 0,
          incorrectCount: 0,
          skippedCount: 0,
        });

        // V2: Add completion feedback message with action attached
        let completionMessage: string;
        if (finalCorrectCount === totalQuestions) {
          completionMessage = `Amazing! You got all ${totalQuestions} questions right! You're ready to dive into the lesson.`;
        } else if (finalCorrectCount > 0) {
          completionMessage = `Nice effort! You got ${finalCorrectCount} out of ${totalQuestions} correct. Let's watch the lesson to strengthen your understanding.`;
        } else {
          completionMessage = `No worries! The warmup helps identify areas to focus on. Let's watch the lesson together.`;
        }

        if (addAssistantMessageRef.current) {
          await addAssistantMessageRef.current(completionMessage, {
            messageType: "general",
            action: "warmup_complete",
            actionMetadata: {},
            tts: true,
          });
        }
      }
    },
    [warmupState, activeLesson?.id, userId, markWarmupAnswered, addWarmupFeedback, addWarmupQuestion, speakTTS]
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
          // Speak the next question (interrupt any playing audio)
          speakTTS(nextQuestion.question, { interrupt: true });
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

        // V2: Add completion feedback message with action attached
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

        if (addAssistantMessageRef.current) {
          await addAssistantMessageRef.current(completionMessage, {
            messageType: "general",
            action: "warmup_complete",
            actionMetadata: {},
            tts: true,
          });
        }
      }
    },
    [warmupState, activeLesson?.id, userId, markWarmupSkipped, addWarmupQuestion, speakTTS]
  );

  // Wrapper for addUserMessage that also sets the flag to track user interaction
  // This prevents welcome messages from being stored - only user messages and responses
  const handleAddUserMessage = useCallback(
    async (message: string, messageType: string = "general", inputType: string = "text") => {
      console.log("[ModuleContent] User sent message, setting userHasSentMessageRef = true, messageType:", messageType);
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
      console.log("[ModuleContent] In-lesson answer received:", { questionId, answer });

      if (!activeInlessonQuestion || activeInlessonQuestion.questionId !== questionId) {
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

          // V2: Add feedback message with action attached and speak it
          addInlessonFeedback(isCorrect, feedback, {
            action: "inlesson_complete",
            actionMetadata: {},
          });
          speakTTS(feedback, { interrupt: true });

          setActiveInlessonQuestion(null);
        } else {
        // Text: Send to agent for evaluation
        console.log("[ModuleContent] Sending text answer to agent for evaluation");

        // Mark question as answered
        markInlessonAnswered(messageId);

        // Send to agent via LiveKit
        if (liveKit.isConnected && liveKit.sendTextToAgent) {
          try {
            await liveKit.sendTextToAgent(`INLESSON_ANSWER:${questionId}:${answer}`);
          } catch (err) {
            console.error("[ModuleContent] Failed to send in-lesson answer:", err);
          }
        }

        // Clear active question (agent will handle feedback)
        setActiveInlessonQuestion(null);
      }
    },
    [activeInlessonQuestion, activeLesson?.id, userId, markInlessonAnswered, addInlessonFeedback, liveKit.isConnected, liveKit.sendTextToAgent, speakTTS]
  );

  // Handler for in-lesson question skip
  const handleInlessonSkip = useCallback(
    async (questionId: string) => {
      console.log("[ModuleContent] In-lesson question skipped:", questionId);

      if (!activeInlessonQuestion || activeInlessonQuestion.questionId !== questionId) {
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

      // V2: Add message with action for "Continue watching" button
      if (addAssistantMessageRef.current) {
        await addAssistantMessageRef.current("Question skipped. Let's continue with the video.", {
          messageType: "general",
          action: "inlesson_complete",
          actionMetadata: {},
          tts: true,
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
    navigateToLesson: (lesson, courseId) => {
      const lessonModuleId = (lesson as { moduleId?: string }).moduleId;

      // If lesson is in a different module, navigate to that module's page
      if (lessonModuleId && lessonModuleId !== module.id) {
        console.log("[ModuleContent] Navigating to different module:", lessonModuleId);
        router.push(`/course/${courseId}/module/${lessonModuleId}?lesson=${lesson.id}`);
      } else {
        // Same module, just select the lesson
        console.log("[ModuleContent] Selecting lesson in same module");
        setSelectedLesson(lesson);
      }
    },
    sendTextToAgent: liveKit.sendTextToAgent,
    addUserMessage: handleAddUserMessage,
    startTour,
    startWarmup: handleInlineWarmup,
    getLastAssistantMessageId,
  };

  const { pendingAction, showAction, dismissAction, handleButtonClick, isActioned, resetHandledActions } = useActionButtons(actionDeps);

  // Keep dismissActionRef updated for use in handleAddUserMessage
  useEffect(() => {
    dismissActionRef.current = dismissAction;
  }, [dismissAction]);

  useEffect(() => {
    resetHandledActions();
  }, [activeLesson?.id, resetHandledActions]);

  // V2: Welcome message is now stored directly in onComplete callback with action attached
  // This old pattern (showAction after welcome completes) is no longer needed
  /*
  // Trigger session type action when direct welcome flow completes
  // (replaces LiveKit-dependent logic)
  useEffect(() => {
    // Debug logging
    console.log("[ModuleContent] Action trigger check:", {
      welcomeComplete,
      directWelcomeMessage: directWelcomeMessage?.substring(0, 30),
      sessionType,
      pendingAction: pendingAction?.type,
      isWelcomePlaying,
      chatMessagesCount: chatMessages.length,
    });

    // Show action buttons when direct welcome is complete
    if (welcomeComplete && sessionType && !pendingAction && directWelcomeMessage) {
      const sessionTypeToAction: Record<string, ActionType> = {
        course_welcome: "course_welcome",
        course_welcome_back: "course_welcome_back",
        lesson_welcome: "lesson_welcome",
        lesson_welcome_back: "lesson_welcome_back",
      };

      const actionType = sessionTypeToAction[sessionType];
      console.log("[ModuleContent] Showing action buttons for:", actionType);
      if (actionType) {
        // Always use "welcome" as anchor for welcome session types
        const anchorMessageId = "welcome";
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
    welcomeComplete,
    directWelcomeMessage,
    sessionType,
    pendingAction,
    showAction,
    sortedLessons,
    activeLesson,
    sessionLessonProgress?.lastPosition,
    prevLessonTitle,
  ]);
  */

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
        ? module.lessons.find((lesson) => lesson.youtubeVideoId === youtubeVideoId)
        : null;

      // Check if this lesson is already selected (avoid re-render)
      const isAlreadySelected = matchingLesson && activeLesson?.id === matchingLesson.id;

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
    [module.lessons, activeLesson?.id, isPlayerReady, seekTo]
  );

  // V2: Callback when action button is clicked - updates message action status
  const handleActionHandled = useCallback(
    (messageId: string, buttonId: string) => {
      updateMessageAction(messageId, "handled", buttonId);
    },
    [updateMessageAction]
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
        hasSelectedLesson={!!activeLesson}
        // LiveKit agent transcript for regular conversations (NOT for welcome)
        // Welcome message is stored via addAssistantMessage with action attached (V2 pattern)
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
        // Action buttons (unified pattern for all action types)
        pendingAction={pendingAction}
        onActionButtonClick={handleButtonClick}
        isActionDisabled={isActioned}
        // In-lesson question handlers
        onInlessonAnswer={handleInlessonAnswer}
        onInlessonSkip={handleInlessonSkip}
        // Warmup question handlers (inline in chat)
        onWarmupAnswer={handleWarmupAnswer}
        onWarmupSkip={handleWarmupSkip}
      />

      {/* Module Lessons Overview - Removed as not needed */}
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
    setIsPanelClosed(true); // Mark panel as explicitly closed
    setSelectedLesson(null);
    // Also update URL to remove the lesson param so clicking on lessons works again
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  const rightPanel = !isPanelClosed && activeLesson?.kpointVideoId ? (
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
            kpointVideoId={activeLesson.kpointVideoId}
            startOffset={effectiveStartOffset}
          />
        </div>
        {/* Lesson Title Below Video */}
        <div className="p-3">
          <h3 className="font-medium text-xs text-foreground line-clamp-2">
            Lesson {activeLesson.orderIndex + 1}: {activeLesson.title}
          </h3>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <ActionsProvider onActionHandled={handleActionHandled}>
      {/* V2: Register action handlers for button clicks */}
      <ActionHandlerRegistry
        playerRef={playerRef}
        seekTo={seekTo}
        setSelectedLesson={setSelectedLesson}
        activeLesson={activeLesson}
        sortedLessons={sortedLessons}
        router={router}
        courseId={course.id}
        startWarmup={handleInlineWarmup}
        startTour={startTour}
        addUserMessage={handleAddUserMessage}
        sendTextToAgent={liveKit.sendTextToAgent}
      />
      <AnimatedBackground variant="full" intensity="medium" theme="learning" />
      <OnboardingModal isReturningUser={isReturningUser} />
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
      <QuizOverlay
        isOpen={assessmentQuiz.isOpen}
        quizType={assessmentQuiz.quizType || "warmup"}
        questions={assessmentQuiz.questions}
        currentQuestionIndex={assessmentQuiz.currentQuestionIndex}
        showFeedback={assessmentQuiz.showFeedback}
        lastAnswer={assessmentQuiz.lastAnswer}
        isLoading={assessmentQuiz.isLoading}
        onSubmitAnswer={assessmentQuiz.submitAnswer}
        onSkipQuestion={assessmentQuiz.skipQuestion}
        onContinue={assessmentQuiz.continueQuiz}
        onClose={assessmentQuiz.close}
      />
      <SuccessMessage show={showSuccessToast} onClose={() => setShowSuccessToast(false)} />
      <ErrorMessage show={showErrorToast} onClose={() => setShowErrorToast(false)} />
    </ActionsProvider>
  );
}
