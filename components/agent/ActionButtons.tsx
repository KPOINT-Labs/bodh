"use client";

import { Button } from "@/components/ui/button";
import { MessageBubble } from "@/components/ui/message-bubble";
import { useLearningPanel } from "@/contexts/LearningPanelContext";
import {
  ACTION_REGISTRY,
  type PendingAction,
} from "@/lib/actions/actionRegistry";

interface ActionButtonsProps {
  pendingAction: PendingAction;
  onButtonClick: (buttonId: string) => void;
  disabled?: boolean;
}

/**
 * Generic action buttons component that renders buttons from the action registry.
 * Works with all action types defined in ACTION_REGISTRY.
 * Also displays introMessage from metadata if present (used for FA intro).
 */
export function ActionButtons({
  pendingAction,
  onButtonClick,
  disabled = false,
}: ActionButtonsProps) {
  const { collapsePanel } = useLearningPanel();
  const definition = ACTION_REGISTRY[pendingAction.type];

  if (!definition) {
    return null;
  }

  // Get introMessage from metadata if present (for FA intro)
  const introMessage = pendingAction.metadata?.introMessage as
    | string
    | undefined;

  const handleClick = (buttonId: string) => {
    // Collapse panel when starting a lesson/video
    const collapseActions = [
      "see_intro",
      "skip_to_lesson",
      "continue",
      "restart",
      "skip",
      "next_lesson",
    ];
    if (collapseActions.includes(buttonId)) {
      collapsePanel();
    }
    onButtonClick(buttonId);
  };

  return (
    <div className="fade-in slide-in-from-bottom-2 animate-in duration-500">
      {/* Display intro message if present */}
      {introMessage && (
        <MessageBubble
          content={introMessage}
          enableAnimation={false}
          type="ai"
        />
      )}
      {/* Action buttons */}
      <div className="ml-11 flex items-center gap-3 pt-4">
        {definition.buttons.map((button) => (
          <Button
            className={
              button.variant === "primary"
                ? "gap-2 rounded-full bg-blue-500 px-5 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                : "gap-2 rounded-full border-gray-300 px-5 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            }
            disabled={disabled}
            key={button.id}
            onClick={() => handleClick(button.id)}
            variant={button.variant === "primary" ? "default" : "outline"}
          >
            {button.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
