"use client";

import { HelpCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CourseBrowser } from "@/components/course/course-browser";
import { LessonHeader } from "@/components/course/LessonHeader";
import { ResizableContent } from "@/components/layout/resizable-content";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { Button } from "@/components/ui/button";
import { ChoiceButtons } from "@/components/ui/choice-buttons";
import { MessageBubble } from "@/components/ui/message-bubble";
import { useTTS } from "@/hooks/useTTS";

interface WelcomeContentProps {
  firstCourse: {
    courseId: string;
    moduleId: string;
  } | null;
  lastCourse: {
    courseId: string;
    courseTitle: string;
    moduleId: string;
  } | null;
  allCourses: Array<{
    id: string;
    title: string;
    description: string | null;
    _count: {
      modules: number;
    };
    firstModule: {
      id: string;
      firstLesson: {
        id: string;
      } | null;
    } | null;
  }>;
}

interface Message {
  id: string;
  type: "ai" | "user" | "course-browser";
  content?: string;
  enableAnimation?: boolean;
  onAnimationComplete?: () => void;
}

export function WelcomeContent({
  firstCourse,
  lastCourse,
  allCourses,
}: WelcomeContentProps) {
  const router = useRouter();
  const { speak } = useTTS();
  const [messages, setMessages] = useState<Message[]>([]);
  const [showButtons, setShowButtons] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const hasStartedRef = useRef(false);

  const addAIMessage = useCallback(
    (content: string, onComplete?: () => void) => {
      console.log("[WelcomeContent] addAIMessage called with:", content);
      const newMessage: Message = {
        id: Date.now().toString() + Math.random(),
        type: "ai",
        content,
        enableAnimation: true,
        onAnimationComplete: () => {
          if (onComplete) {
            onComplete();
          }
        },
      };
      setMessages((prev) => [...prev, newMessage]);

      if (content) {
        console.log("[WelcomeContent] Calling speak() with interrupt: true");
        speak(content, { interrupt: true });
      } else {
        console.log("[WelcomeContent] Content is empty, skipping TTS");
      }
    },
    [speak]
  );

  // Check if onboarding should be shown
  useEffect(() => {
    // Small delay to ensure localStorage is accessible
    const checkOnboarding = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const forceTour = urlParams.get("tour") === "true";
      const hasCompletedOnboarding = localStorage.getItem("bodh-onboarding-v1");

      // If tour is forced or user hasn't completed onboarding, wait for it
      if (forceTour || !hasCompletedOnboarding) {
        setOnboardingComplete(false);
      } else {
        // User has completed onboarding and tour not forced, start immediately
        setOnboardingComplete(true);
      }
    };

    // Small delay to ensure component is mounted
    setTimeout(checkOnboarding, 100);
  }, []);

  useEffect(() => {
    // Check for return_from_tour query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const returnFromTour = urlParams.get("return_from_tour") === "true";

    if (returnFromTour) {
      // Skip typing animation, show content immediately
      hasStartedRef.current = true;

      // Add welcome message instantly without animation
      const welcomeMessage: Message = {
        id: Date.now().toString() + Math.random(),
        type: "ai",
        content:
          "नमस्ते! I'm your personal AI learning companion. I'm here whenever you need help—clarifying a concept, checking your understanding, or even just exploring new ideas. Let's learn together.",
        enableAnimation: false, // No animation when returning from tour
      };
      setMessages([welcomeMessage]);
      setShowButtons(true);

      // Clean URL while preserving other query params
      urlParams.delete("return_from_tour");
      const newSearch = urlParams.toString();
      const newUrl = newSearch ? `/courses?${newSearch}` : "/courses";
      window.history.replaceState({}, "", newUrl);
      return;
    }

    // Start the orchestrated welcome sequence (only once and after onboarding)
    if (!hasStartedRef.current && onboardingComplete) {
      hasStartedRef.current = true;

      // Delay initial message like reference project (500ms)
      setTimeout(() => {
        // Add first AI message using addAIMessage helper
        addAIMessage(
          "नमस्ते! I'm your personal AI learning companion. I'm here whenever you need help—clarifying a concept, checking your understanding, or even just exploring new ideas. Let's learn together.",
          () => {
            // Show buttons after message animation completes (2s delay like reference)
            setTimeout(() => {
              setShowButtons(true);
            }, 2000);
          }
        );
      }, 500);
    }
  }, [
    onboardingComplete, // Add first AI message using addAIMessage helper
    addAIMessage,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOnboardingComplete = () => {
    setOnboardingComplete(true);
  };

  const addUserMessage = (content: string, onComplete?: () => void) => {
    const newMessage: Message = {
      id: Date.now().toString() + Math.random(),
      type: "user",
      content,
      enableAnimation: true,
      onAnimationComplete: () => {
        if (onComplete) {
          onComplete();
        }
      },
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const addCourseBrowser = () => {
    const newMessage: Message = {
      id: Date.now().toString() + Math.random(),
      type: "course-browser",
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleStartNewCourse = () => {
    setShowButtons(false);

    // Add user message
    addUserMessage("Browse All Courses", () => {
      // After user message completes, add AI response
      setTimeout(() => {
        addAIMessage(
          "Great! Here are all the available courses you can explore and start learning:",
          () => {
            // After AI message completes, show course browser
            setTimeout(() => {
              addCourseBrowser();
            }, 500);
          }
        );
      }, 500);
    });
  };

  const handleContinueCourse = () => {
    if (!lastCourse) {
      return;
    }

    setShowButtons(false);
    addUserMessage(`Continue ${lastCourse.courseTitle}`, () => {
      setTimeout(() => {
        router.push(
          `/course/${lastCourse.courseId}/module/${lastCourse.moduleId}`
        );
      }, 500);
    });
  };

  const handleTakeTour = () => {
    // Redirect to tour mode with current page as return destination
    router.push("/course/demo/module/demo?tour=true&redirect_back_to=/courses");
  };

  const header = (
    <LessonHeader
      additionalActions={
        <Button
          className="gap-2"
          onClick={handleTakeTour}
          size="sm"
          variant="outline"
        >
          <HelpCircle className="h-4 w-4" />
          Take a Tour
        </Button>
      }
      courseTitle="Welcome"
      moduleTitle="Getting Started"
    />
  );

  const content = (
    <div className="px-2 py-3">
      {/* Center-aligned chat container matching demo project */}
      <div className="mx-auto max-w-4xl space-y-6">
        {/* All messages rendered from state array */}
        {messages.map((message, index) => {
          if (message.type === "course-browser") {
            return <CourseBrowser courses={allCourses} key={message.id} />;
          }

          return (
            <MessageBubble
              content={message.content || ""}
              enableAnimation={message.enableAnimation}
              isFirstMessage={index === 0}
              key={message.id}
              onAnimationComplete={message.onAnimationComplete}
              type={message.type} // First message gets special styling
            />
          );
        })}
      </div>
    </div>
  );

  const footer = showButtons ? (
    <div className="px-2 py-3">
      {/* Center-aligned footer matching chat area */}
      <div className="mx-auto max-w-4xl">
        <div className="rounded-xl border border-blue-200 bg-white/60 px-4 py-3 shadow-blue-200/30 shadow-lg backdrop-blur-xl">
          <ChoiceButtons
            buttons={[
              ...(firstCourse
                ? [{ label: "Browse All Courses", action: "start-new" }]
                : []),
              ...(lastCourse
                ? [
                    {
                      label: `Continue ${lastCourse.courseTitle}`,
                      action: "continue",
                    },
                  ]
                : []),
            ]}
            onSelect={(action) => {
              if (action === "start-new") {
                handleStartNewCourse();
              } else if (action === "continue") {
                handleContinueCourse();
              }
            }}
          />
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <AnimatedBackground intensity="medium" theme="learning" variant="full" />
      <OnboardingModal onComplete={handleOnboardingComplete} />
      <ResizableContent
        content={content}
        footer={footer}
        header={header}
        rightPanel={null}
      />
    </>
  );
}
