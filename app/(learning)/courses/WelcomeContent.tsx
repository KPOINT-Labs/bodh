"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, PlayCircle, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResizableContent } from "@/components/layout/resizable-content";
import { LessonHeader } from "@/components/course/LessonHeader";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { MessageBubble } from "@/components/ui/message-bubble";
import { CourseBrowser } from "@/components/course/course-browser";
import { ChoiceButtons } from "@/components/ui/choice-buttons";
import { useTTS } from "@/hooks/useTTS";
import { AudioToggleButton } from "@/components/audio/AudioToggleButton";

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
  const [showButtons, setShowButtons] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Auto-play welcome message on mount
    speak(
      "नमस्ते! I'm your personal AI learning companion. I'm here whenever you need help—clarifying a concept, checking your understanding, or even just exploring new ideas. Let's learn together."
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        setIsProcessing(false);
      }
    };
    setMessages(prev => [...prev, newMessage]);
    setIsProcessing(true);
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
        setIsProcessing(false);
      }
    };
    setMessages(prev => [...prev, newMessage]);
    setIsProcessing(true);
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
    addUserMessage("Start New course", () => {
      // After user message completes, add AI response
      setTimeout(() => {
        addAIMessage("Great! Here are the available courses you can start with:", () => {
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

  const header = (
    <div className="flex items-center justify-between">
      <LessonHeader courseTitle="Welcome" moduleTitle="Getting Started" />
      <div className="mr-4">
        <AudioToggleButton />
      </div>
    </div>
  );

  const content = (
    <div className="px-2 py-3">
      {/* Center-aligned chat container matching demo project */}
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Message Timeline */}
        <MessageBubble
          type="ai"
          content="नमस्ते! I'm your personal AI learning companion. I'm here whenever you need help—clarifying a concept, checking your understanding, or even just exploring new ideas. Let's learn together."
          isFirstMessage={true}
        />

        {/* Dynamic Messages */}
        {messages.map((message) => {
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
              ...(firstCourse ? [{ label: 'Start New Course', action: 'start-new' }] : []),
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
      <OnboardingModal />
      <ResizableContent
        header={header}
        content={content}
        footer={footer}
        rightPanel={null}
      />
    </>
  );
}
