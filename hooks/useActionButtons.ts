/**
 * useActionButtons - Hook for managing action button state
 *
 * Provides a unified interface for showing, dismissing, and handling
 * action button clicks across all action types.
 */

import { useState, useCallback, useRef } from "react";
import { ACTION_REGISTRY, type ActionType, type PendingAction } from "@/lib/actions/actionRegistry";
import { ACTION_HANDLERS, ActionDependencies } from "@/lib/actions/actionHandlers";

interface UseActionButtonsReturn {
  /** Currently pending action, or null if none */
  pendingAction: PendingAction | null;
  /** Show an action with optional metadata */
  showAction: (type: ActionType, metadata?: Record<string, unknown>, anchorMessageId?: string) => void;
  /** Dismiss the current action without clicking a button */
  dismissAction: () => void;
  /** Handle a button click - executes handler and dismisses */
  handleButtonClick: (buttonId: string) => void;
  /** True after a button is clicked (used to disable buttons) */
  isActioned: boolean;
  /** Check if a specific action type has already been handled */
  hasBeenHandled: (type: ActionType) => boolean;
  /** Reset handled state (e.g., when lesson changes) */
  resetHandledActions: () => void;
}

export function useActionButtons(deps: ActionDependencies): UseActionButtonsReturn {
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isActioned, setIsActioned] = useState(false);
  const handledActionsRef = useRef<Set<ActionType>>(new Set());

  const hasBeenHandled = useCallback((type: ActionType) => {
    return handledActionsRef.current.has(type);
  }, []);

  const resetHandledActions = useCallback(() => {
    handledActionsRef.current.clear();
  }, []);

  const showAction = useCallback((type: ActionType, metadata?: Record<string, unknown>, anchorMessageId?: string) => {
    if (handledActionsRef.current.has(type)) {
      return;
    }
    setPendingAction({ type, metadata, anchorMessageId });
    setIsActioned(false);
  }, []);

  const dismissAction = useCallback(() => {
    // Mark the current action as handled so it won't be re-shown
    if (pendingAction) {
      handledActionsRef.current.add(pendingAction.type);
    }
    setPendingAction(null);
    setIsActioned(false);
  }, [pendingAction]);

  const handleButtonClick = useCallback(
    async (buttonId: string) => {
      if (!pendingAction || isActioned) return;

      setIsActioned(true); // Disable buttons immediately

      // Execute the handler
      const handler = ACTION_HANDLERS[pendingAction.type];
      if (handler) {
        try {
          await handler(buttonId, pendingAction.metadata || {}, deps);
        } catch (error) {
          console.error(`[useActionButtons] Handler error for ${pendingAction.type}:`, error);
        }
      }

      const definition = ACTION_REGISTRY[pendingAction.type];
      const shouldReEnable = definition?.dismissAfterClick === false;

      handledActionsRef.current.add(pendingAction.type);

      if (shouldReEnable) {
        setIsActioned(false);
      }
    },
    [pendingAction, isActioned, deps]
  );

  return {
    pendingAction,
    showAction,
    dismissAction,
    handleButtonClick,
    isActioned,
    hasBeenHandled,
    resetHandledActions,
  };
}
