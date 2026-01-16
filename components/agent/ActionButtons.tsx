"use client";

import { Button } from "@/components/ui/button";
import { Play, RotateCcw, Pause } from "lucide-react";
import { useLearningPanel } from "@/contexts/LearningPanelContext";
import type { Lesson, Module } from "@/types/chat";

interface ActionButtonsProps {
  firstLesson: Lesson;
  module: Module;
  isReturningUser: boolean;
  isVideoPlaying?: boolean;
  onStartLesson: () => void;
  onContinueLearning: () => void;
}

/**
 * Action buttons for starting or continuing lessons
 * Shows different UI for new vs returning users
 */
export function ActionButtons({
  firstLesson,
  module,
  isReturningUser,
  isVideoPlaying = false,
  onStartLesson,
  onContinueLearning,
}: ActionButtonsProps) {
  const { collapsePanel } = useLearningPanel();

  const handleStartLesson = () => {
    collapsePanel();
    onStartLesson();
  };

  const handleContinueLearning = () => {
    collapsePanel();
    onContinueLearning();
  };

  // Show video playing state
  if (isVideoPlaying) {
    return (
      <div className="pt-4 ml-11 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full border border-green-200">
            <Pause className="h-4 w-4 animate-pulse" />
            <span className="text-sm font-medium">Video Playing</span>
          </div>
        </div>
      </div>
    );
  }

  if (isReturningUser) {
    return (
      <div className="pt-4 ml-11 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <p className="text-sm font-medium text-gray-700">
          Would you like to continue where you left off?
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleContinueLearning}
            className="gap-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full px-5"
          >
            <RotateCcw className="h-4 w-4" />
            Continue Learning
          </Button>
          <Button
            variant="outline"
            onClick={handleStartLesson}
            className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-full px-5"
          >
            <Play className="h-4 w-4" />
            Start from Beginning
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 ml-11 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <p className="text-sm font-medium text-gray-700">
        Let&apos;s start with{" "}
        <span className="text-blue-500 font-semibold">
          Lesson {firstLesson.orderIndex + 1}: {firstLesson.title}
        </span>{" "}
        from <span className="text-blue-500 font-semibold">{module.title}</span>
      </p>
      <Button
        onClick={handleStartLesson}
        className="gap-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full px-5"
      >
        <Play className="h-4 w-4" />
        Start Lesson
      </Button>
    </div>
  );
}
