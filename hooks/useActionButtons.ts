/**
 * useActionButtons - Hook for managing action button state
 *
 * Provides a unified interface for showing, dismissing, and handling
 * action button clicks across all action types.
 */

import { useState, useCallback, useRef } from "react";
import { ACTION_REGISTRY, type ActionType, type PendingAction } from "@/lib/actions/actionRegistry";
import type { ActionDependencies } from "@/lib/actions/actionHandlers";

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
    const resolvedAnchor = anchorMessageId ?? deps.getLastAssistantMessageId?.();
    console.log("[useActionButtons] showAction", {
      type,
      anchorMessageId,
      resolvedAnchor,
      hasLastAssistant: !!deps.getLastAssistantMessageId,
    });
    setPendingAction({ type, metadata, anchorMessageId: resolvedAnchor });
    setIsActioned(false);
  }, [deps]);

  const dismissAction = useCallback(() => {
    // Mark the current action as handled so it won't be re-shown
    if (pendingAction) {
      console.log("[useActionButtons] dismissAction", {
        type: pendingAction.type,
        anchorMessageId: pendingAction.anchorMessageId,
      });
      handledActionsRef.current.add(pendingAction.type);
    }
    setPendingAction(null);
    setIsActioned(false);
  }, [pendingAction]);

  const handleButtonClick = useCallback(
    async (buttonId: string) => {
      if (!pendingAction || isActioned) return;

      setIsActioned(true); // Disable buttons immediately

      console.log("[useActionButtons] handleButtonClick", {
        type: pendingAction.type,
        buttonId,
        anchorMessageId: pendingAction.anchorMessageId,
      });

      // Note: Actual handler execution is done via ActionsContext + ActionHandlerRegistry
      // This hook now only manages state (pending action, isActioned, handled tracking)

      const definition = ACTION_REGISTRY[pendingAction.type];
      const shouldReEnable = definition?.dismissAfterClick === false;

      handledActionsRef.current.add(pendingAction.type);

      if (shouldReEnable) {
        setIsActioned(false);
      }
    },
    [pendingAction, isActioned]
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
