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
import { X } from "lucide-react";
import { toast } from "sonner";
import { mockTourData } from "@/lib/mockTourData";
import { useTour } from "@/hooks/useTour";
import { MessageBubble } from "@/components/ui/message-bubble";
import { QuizOverlay } from "@/components/assessment/QuizOverlay";

// Hooks
import { useKPointPlayer } from "@/hooks/useKPointPlayer";
import { useAssessmentQuiz } from "@/hooks/useAssessmentQuiz";
import { useChatSession } from "@/hooks/useChatSession";
import { useLiveKit, TranscriptSegment, UserTranscription } from "@/hooks/useLiveKit";
import { useSessionType } from "@/hooks/useSessionType";
import { useLearningPanel } from "@/contexts/LearningPanelContext";
import { useAudioContext } from "@/contexts/AudioContext";
import { getLessonProgress } from "@/lib/actions/lesson-progress";
import { useActionButtons } from "@/hooks/useActionButtons";
import type { ActionType } from "@/lib/actions/actionRegistry";
import type { ActionDependencies } from "@/lib/actions/actionHandlers";
import type { LessonQuiz } from "@/types/assessment";

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
  // Ref for showAction to use in callbacks (set after useActionButtons)
  const showActionRef = useRef<((type: ActionType, metadata?: Record<string, unknown>) => void) | null>(null);
  // Ref for dismissAction to use in handleAddUserMessage (set after useActionButtons)
  const dismissActionRef = useRef<(() => void) | null>(null);

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
          const topicRegex = /covering ([^.]+)\. Let's do a quick check/;
          const match = text.match(topicRegex);
          if (match && match[1]) {
            const topic = match[1];
            console.log("[ModuleContent] FA intro transcript detected, showing buttons for topic:", topic);

            // Save the FA intro message to DB and show in chat
            if (addAssistantMessageRef.current) {
              addAssistantMessageRef.current(text, "fa");
            }

            // Show action buttons (no introMessage since it's already saved above)
            if (showActionRef.current) {
              showActionRef.current("fa_intro", { topic });
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
  const handleFAIntroComplete = useCallback((data: { topic: string; introMessage: string }) => {
    console.log("[ModuleContent] FA intro complete, showing buttons for topic:", data.topic);

    // Save the FA intro message to DB and show in chat
    if (data.introMessage && addAssistantMessageRef.current) {
      addAssistantMessageRef.current(data.introMessage, "fa");
    }

    // Show action buttons (no introMessage since it's saved above)
    if (showActionRef.current) {
      showActionRef.current("fa_intro", { topic: data.topic });
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

  // Handle video end - auto-play next lesson
  const handleVideoEnd = useCallback(async () => {
    console.log("[ModuleContent] handleVideoEnd called", {
      activeLesson: activeLesson?.title,
      lessonsCount: module.lessons.length,
    });

    if (!activeLesson || !module.lessons.length) {
      console.log("[ModuleContent] handleVideoEnd early return - no active lesson or lessons");
      return;
    }

    // Sort lessons by orderIndex to find the next one
    const sortedLessonsList = [...module.lessons].sort((a, b) => a.orderIndex - b.orderIndex);
    const currentIndex = sortedLessonsList.findIndex((l) => l.id === activeLesson.id);

    // Check if there's a next lesson
    if (currentIndex >= 0 && currentIndex < sortedLessonsList.length - 1) {
      const nextLesson = sortedLessonsList[currentIndex + 1];
      console.log(`[ModuleContent] Video ended, auto-playing next lesson: ${nextLesson.title}`);

      // Select the next lesson (this will trigger the video player to load)
      setSelectedLesson(nextLesson);

      // Notify the agent about the new lesson to start a new conversation
      if (liveKit.isConnected) {
        try {
          const message = `The user has started watching the next lesson: "${nextLesson.title}". Please greet them briefly and let them know you're here to help with any questions about this lesson.`;
          await liveKit.sendTextToAgent(message);
        } catch (err) {
          console.error("[ModuleContent] Failed to notify agent about next lesson:", err);
        }
      }

      toast.success("Playing next lesson", {
        description: nextLesson.title,
        duration: 2000,
      });
    } else {
      // No more lessons in current module - try to get next module
      console.log("[ModuleContent] Video ended, no more lessons in module. Checking for next module...");

      try {
        const response = await fetch(
          `/api/courses/${course.id}/next-module?currentModuleId=${module.id}`
        );
        const data = await response.json();

        if (data.success && data.hasNextModule && data.nextModule?.firstLesson) {
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
            description: "Congratulations! You've finished all modules in this course",
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
  }, [activeLesson, module.lessons, module.id, course.id, liveKit.isConnected, liveKit.sendTextToAgent, router, pathname]);

  // Get video duration from lesson (stored in seconds in database)
  const videoDuration = activeLesson?.duration || 0;

  // Calculate effective start offset (manual timestamp OR saved position for in_progress lessons)
  const effectiveStartOffset = videoStartOffset ??
    (lessonProgress?.status === "in_progress" ? lessonProgress.lastPosition : null);

  // DEBUG: Log progress tracking parameters
  console.log("[ModuleContent] Progress tracking params:", {
    userId,
    lessonId: activeLesson?.id,
    videoDuration,
    hasKpointVideoId: !!activeLesson?.kpointVideoId,
  });

  // KPoint player hook with FA trigger integration
  const { seekTo, getCurrentTime, isPlayerReady, isPlaying, playerRef } = useKPointPlayer({
    kpointVideoId: activeLesson?.kpointVideoId,
    userId,
    lessonId: activeLesson?.id,
    videoDuration,
    onVideoEnd: handleVideoEnd,
    quizData: (activeLesson?.quiz ?? null) as LessonQuiz | null,
    onInLessonTrigger: (questionId: string) => {
      // Trigger in-lesson question from quiz data
      console.log("[ModuleContent] In-lesson question triggered:", questionId);
      assessmentQuiz.startInlesson(questionId);
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
  const { chatMessages, isSending, addUserMessage, addAssistantMessage } = useChatSession({
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
    startWarmup: assessmentQuiz.startWarmup,
  };

  const { pendingAction, showAction, dismissAction, handleButtonClick, isActioned, resetHandledActions } = useActionButtons(actionDeps);

  // Keep showActionRef updated for use in callbacks
  useEffect(() => {
    showActionRef.current = showAction;
  }, [showAction]);

  // Keep dismissActionRef updated for use in handleAddUserMessage
  useEffect(() => {
    dismissActionRef.current = dismissAction;
  }, [dismissAction]);

  // Reset handled actions when lesson changes (allows new welcome flows)
  useEffect(() => {
    resetHandledActions();
  }, [activeLesson?.id, resetHandledActions]);

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
      // Map session type to action type and show action buttons
      const sessionTypeToAction: Record<string, ActionType> = {
        course_welcome: "course_welcome",
        course_welcome_back: "course_welcome_back",
        lesson_welcome: "lesson_welcome",
        lesson_welcome_back: "lesson_welcome_back",
      };

      const actionType = sessionTypeToAction[sessionType];
      console.log("[ModuleContent] Showing action buttons for:", actionType);
      if (actionType) {
        showAction(actionType, {
          introLesson: sortedLessons[0],
          firstLesson: sortedLessons[1] || sortedLessons[0],
          lastLesson: activeLesson,
          lastPosition: sessionLessonProgress?.lastPosition || 0,
          prevLessonTitle,
        });
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
        // Action buttons (unified pattern for all action types)
        pendingAction={pendingAction}
        onActionButtonClick={handleButtonClick}
        isActionDisabled={isActioned}
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
    <>
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
      {/* Quiz Overlay for warmup and in-lesson questions */}
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
    </>
  );
}
