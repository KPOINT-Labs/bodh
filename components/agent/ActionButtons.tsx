import { Button } from "@/components/ui/button";
import { Play, RotateCcw } from "lucide-react";
import type { Lesson, Module } from "@/types/chat";

interface ActionButtonsProps {
  firstLesson: Lesson;
  module: Module;
  isReturningUser: boolean;
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
  onStartLesson,
  onContinueLearning,
}: ActionButtonsProps) {
  if (isReturningUser) {
    return (
      <div className="pt-4 ml-11 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <p className="text-sm font-medium text-gray-700">
          Would you like to continue where you left off?
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={onContinueLearning}
            className="gap-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full px-5"
          >
            <RotateCcw className="h-4 w-4" />
            Continue Learning
          </Button>
          <Button
            variant="outline"
            onClick={onStartLesson}
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
        onClick={onStartLesson}
        className="gap-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full px-5"
      >
        <Play className="h-4 w-4" />
        Start Lesson
      </Button>
    </div>
  );
}
