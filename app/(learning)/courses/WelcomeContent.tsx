"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ResizableContent } from "@/components/layout/resizable-content";
import { LessonHeader } from "@/components/course/LessonHeader";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { MessageBubble } from "@/components/ui/message-bubble";
import { CourseBrowser } from "@/components/course/course-browser";
import { ChoiceButtons } from "@/components/ui/choice-buttons";
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
  }>;
}

type Message = {
  id: string;
  type: 'ai' | 'user' | 'course-browser';
  content?: string;
  enableAnimation?: boolean;
  onAnimationComplete?: () => void;
};

export function WelcomeContent({ firstCourse, lastCourse, allCourses }: WelcomeContentProps) {
  const router = useRouter();
  const { speak } = useTTS();
  const [messages, setMessages] = useState<Message[]>([]);
  const [showButtons, setShowButtons] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const hasStartedRef = useRef(false);

  // Check if onboarding should be shown
  useEffect(() => {
    // Small delay to ensure localStorage is accessible
    const checkOnboarding = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const forceTour = urlParams.get('tour') === 'true';
      const hasCompletedOnboarding = localStorage.getItem('bodh-onboarding-v1');

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
    // Start the orchestrated welcome sequence (only once and after onboarding)
    if (!hasStartedRef.current && onboardingComplete) {
      hasStartedRef.current = true;

      // Delay initial message like reference project (500ms)
      setTimeout(() => {
        // Add first AI message with animation enabled
        const welcomeMessage: Message = {
          id: Date.now().toString() + Math.random(),
          type: 'ai',
          content: "नमस्ते! I'm your personal AI learning companion. I'm here whenever you need help—clarifying a concept, checking your understanding, or even just exploring new ideas. Let's learn together.",
          enableAnimation: true,
          onAnimationComplete: () => {
            // Show buttons after message animation completes (2s delay like reference)
            setTimeout(() => {
              setShowButtons(true);
            }, 2000);
          }
        };
        setMessages([welcomeMessage]);

        // Trigger TTS
        if (welcomeMessage.content) {
          speak(welcomeMessage.content);
        }
      }, 500);
    }
  }, [onboardingComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOnboardingComplete = () => {
    setOnboardingComplete(true);
  };

  const addAIMessage = (content: string, onComplete?: () => void) => {
    const newMessage: Message = {
      id: Date.now().toString() + Math.random(),
      type: 'ai',
      content,
      enableAnimation: true,
      onAnimationComplete: () => {
        if (onComplete) {
          onComplete();
        }
      }
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const addUserMessage = (content: string, onComplete?: () => void) => {
    const newMessage: Message = {
      id: Date.now().toString() + Math.random(),
      type: 'user',
      content,
      enableAnimation: true,
      onAnimationComplete: () => {
        if (onComplete) {
          onComplete();
        }
      }
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const addCourseBrowser = () => {
    const newMessage: Message = {
      id: Date.now().toString() + Math.random(),
      type: 'course-browser',
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleStartNewCourse = () => {
    setShowButtons(false);

    // Add user message
    addUserMessage("Browse All Courses", () => {
      // After user message completes, add AI response
      setTimeout(() => {
        addAIMessage("Great! Here are all the available courses you can explore and start learning:", () => {
          // After AI message completes, show course browser
          setTimeout(() => {
            addCourseBrowser();
          }, 500);
        });
      }, 500);
    });
  };

  const handleContinueCourse = () => {
    if (!lastCourse) return;

    setShowButtons(false);
    addUserMessage(`Continue ${lastCourse.courseTitle}`, () => {
      setTimeout(() => {
        router.push(`/course/${lastCourse.courseId}/module/${lastCourse.moduleId}`);
      }, 500);
    });
  };

  const handleCourseSelection = (courseId: string) => {
    const selectedCourse = allCourses.find(c => c.id === courseId);
    if (!selectedCourse) return;

    addUserMessage(`I'd like to start ${selectedCourse.title}`, () => {
      // Navigate to course after message animation
      setTimeout(() => {
        // For now, navigate to first module of the course
        // This assumes we need to fetch the first module - we'll handle that server-side
        router.push(`/course/${courseId}`);
      }, 500);
    });
  };

  const header = <LessonHeader courseTitle="Welcome" moduleTitle="Getting Started" />;

  const content = (
    <div className="px-2 py-3">
      {/* Center-aligned chat container matching demo project */}
      <div className="max-w-4xl mx-auto space-y-6">
        {/* All messages rendered from state array */}
        {messages.map((message, index) => {
          if (message.type === 'course-browser') {
            return (
              <CourseBrowser
                key={message.id}
                courses={allCourses}
                onSelectCourse={handleCourseSelection}
              />
            );
          }

          return (
            <MessageBubble
              key={message.id}
              type={message.type}
              content={message.content || ''}
              enableAnimation={message.enableAnimation}
              onAnimationComplete={message.onAnimationComplete}
              isFirstMessage={index === 0} // First message gets special styling
            />
          );
        })}
      </div>
    </div>
  );

  const footer = showButtons ? (
    <div className="px-2 py-3">
      {/* Center-aligned footer matching chat area */}
      <div className="max-w-4xl mx-auto">
        <div className="backdrop-blur-xl bg-white/60 border border-blue-200 rounded-xl px-4 py-3 shadow-lg shadow-blue-200/30">
          <ChoiceButtons
            buttons={[
              ...(firstCourse ? [{ label: 'Browse All Courses', action: 'start-new' }] : []),
              ...(lastCourse ? [{ label: `Continue ${lastCourse.courseTitle}`, action: 'continue' }] : []),
            ]}
            onSelect={(action) => {
              if (action === 'start-new') {
                handleStartNewCourse();
              } else if (action === 'continue') {
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
      <AnimatedBackground variant="full" intensity="medium" theme="learning" />
      <OnboardingModal onComplete={handleOnboardingComplete} />
      <ResizableContent
        header={header}
        content={content}
        footer={footer}
        rightPanel={null}
      />
    </>
  );
}
