"use client";

import { Button } from "@/components/ui/button";
import { ACTION_REGISTRY, PendingAction } from "@/lib/actions/actionRegistry";
import { useLearningPanel } from "@/contexts/LearningPanelContext";

interface ActionButtonsProps {
  pendingAction: PendingAction;
  onButtonClick: (buttonId: string) => void;
  disabled?: boolean;
}

/**
 * Generic action buttons component that renders buttons from the action registry.
 * Works with all action types defined in ACTION_REGISTRY.
 */
export function ActionButtons({
  pendingAction,
  onButtonClick,
  disabled = false,
}: ActionButtonsProps) {
  const { collapsePanel } = useLearningPanel();
  const definition = ACTION_REGISTRY[pendingAction.type];

  if (!definition) return null;

  const handleClick = (buttonId: string) => {
    // Collapse panel when starting a lesson/video
    const collapseActions = ["see_intro", "skip_to_lesson", "continue", "restart", "skip", "next_lesson"];
    if (collapseActions.includes(buttonId)) {
      collapsePanel();
    }
    onButtonClick(buttonId);
  };

  return (
    <div className="flex items-center gap-3 ml-11 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {definition.buttons.map((button) => (
        <Button
          key={button.id}
          onClick={() => handleClick(button.id)}
          disabled={disabled}
          variant={button.variant === "primary" ? "default" : "outline"}
          className={
            button.variant === "primary"
              ? "gap-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full px-5 disabled:opacity-50 disabled:cursor-not-allowed"
              : "gap-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-full px-5 disabled:opacity-50 disabled:cursor-not-allowed"
          }
        >
          {button.label}
        </Button>
      ))}
    </div>
  );
}
