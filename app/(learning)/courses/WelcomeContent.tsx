"use client";

import Link from "next/link";
import { Sparkles, PlayCircle, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResizableContent } from "@/components/layout/resizable-content";
import { LessonHeader } from "@/components/course/LessonHeader";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";

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
}

export function WelcomeContent({ firstCourse, lastCourse }: WelcomeContentProps) {
  const header = (
    <LessonHeader courseTitle="Welcome" moduleTitle="Getting Started" />
  );

  const content = (
    <div className="space-y-6 pb-3">
      <Card className="bg-white border border-gray-200 shadow-sm p-6">
        {/* Chat Header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">AI Learning Assistant</p>
            <p className="text-xs text-gray-500">Your personal guide</p>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
            <p className="text-sm leading-relaxed text-gray-800">
              नमस्ते! I'm your personal AI learning companion. I'm here whenever you need help—clarifying a concept, checking your understanding, or even just exploring new ideas. Let's learn together.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6 ml-11">
          {firstCourse && (
            <Link href={`/course/${firstCourse.courseId}/module/${firstCourse.moduleId}`}>
              <Button className="w-full sm:w-auto gap-2">
                <PlayCircle className="h-4 w-4" />
                Start New Course
              </Button>
            </Link>
          )}

          {lastCourse && (
            <Link href={`/course/${lastCourse.courseId}/module/${lastCourse.moduleId}`}>
              <Button variant="outline" className="w-full sm:w-auto gap-2">
                <RotateCcw className="h-4 w-4" />
                Continue {lastCourse.courseTitle}
              </Button>
            </Link>
          )}
        </div>
      </Card>
    </div>
  );

  const footer = (
    <div className="p-4 border-t border-gray-200 bg-white">
      <p className="text-sm text-center text-gray-500">
        Select an option above to begin your learning journey
      </p>
    </div>
  );

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
