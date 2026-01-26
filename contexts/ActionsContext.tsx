"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { ActionType } from "@/lib/actions/actionRegistry";

type ActionHandler = (metadata: Record<string, unknown>) => void | Promise<void>;

interface ActionsContextType {
  /**
   * Handle a button click on an action
   * Looks up the registered handler and executes it
   */
  handleButtonClick: (
    messageId: string,
    actionType: ActionType,
    buttonId: string,
    metadata: Record<string, unknown>
  ) => Promise<void>;

  /**
   * Register a handler for a specific action type and button ID
   */
  registerHandler: (actionType: ActionType, buttonId: string, handler: ActionHandler) => void;

  /**
   * Unregister a handler
   */
  unregisterHandler: (actionType: ActionType, buttonId: string) => void;
}

const ActionsContext = createContext<ActionsContextType | null>(null);

interface ActionsProviderProps {
  children: ReactNode;
  /**
   * Called after a button is clicked and handler executed
   * Used to update message action status
   */
  onActionHandled?: (messageId: string, buttonId: string) => void;
}

/**
 * ActionsProvider - Distributed handler registry for action buttons
 *
 * Instead of centralizing all action handlers in one place (V1),
 * components can register handlers for the actions they own.
 *
 * Example:
 * - Video player registers handlers for "continue_video", "watch_lesson"
 * - Navigation component registers handlers for "next_lesson"
 * - Warmup component registers handlers for "start_warmup"
 */
export function ActionsProvider({ children, onActionHandled }: ActionsProviderProps) {
  // Use ref to avoid recreating callbacks when handlers change
  const handlersRef = useRef<Map<string, ActionHandler>>(new Map());

  const registerHandler = useCallback(
    (actionType: ActionType, buttonId: string, handler: ActionHandler) => {
      const key = `${actionType}:${buttonId}`;
      handlersRef.current.set(key, handler);
      console.log(`[ActionsProvider] Registered handler for ${key}`);
    },
    []
  );

  const unregisterHandler = useCallback((actionType: ActionType, buttonId: string) => {
    const key = `${actionType}:${buttonId}`;
    handlersRef.current.delete(key);
    console.log(`[ActionsProvider] Unregistered handler for ${key}`);
  }, []);

  const handleButtonClick = useCallback(
    async (
      messageId: string,
      actionType: ActionType,
      buttonId: string,
      metadata: Record<string, unknown>
    ) => {
      const key = `${actionType}:${buttonId}`;
      const handler = handlersRef.current.get(key);

      console.log(`[ActionsProvider] Button clicked: ${key}`, { messageId, metadata });

      if (handler) {
        try {
          await handler(metadata);
          console.log(`[ActionsProvider] Handler executed successfully for ${key}`);
        } catch (error) {
          console.error(`[ActionsProvider] Handler error for ${key}:`, error);
        }
      } else {
        console.warn(`[ActionsProvider] No handler registered for ${key}`);
      }

      // Notify parent that action was handled
      onActionHandled?.(messageId, buttonId);
    },
    [onActionHandled]
  );

  const value = useMemo<ActionsContextType>(
    () => ({ handleButtonClick, registerHandler, unregisterHandler }),
    [handleButtonClick, registerHandler, unregisterHandler]
  );

  return <ActionsContext.Provider value={value}>{children}</ActionsContext.Provider>;
}

/**
 * Hook to access action handlers
 */
export function useActions() {
  const context = useContext(ActionsContext);
  if (!context) {
    throw new Error("useActions must be used within ActionsProvider");
  }
  return context;
}

/**
 * Hook to check if ActionsProvider is available
 * Useful for components that may be used outside ActionsProvider
 */
export function useActionsOptional() {
  return useContext(ActionsContext);
}

/**
 * Helper hook for registering handlers with automatic cleanup
 *
 * Example:
 * ```tsx
 * useRegisterActionHandlers([
 *   {
 *     actionType: "inlesson_complete",
 *     buttonId: "continue_video",
 *     handler: () => playerRef.current?.playVideo()
 *   },
 *   {
 *     actionType: "warmup_complete",
 *     buttonId: "watch_lesson",
 *     handler: () => playerRef.current?.playVideo()
 *   },
 * ]);
 * ```
 */
export function useRegisterActionHandlers(
  handlers: Array<{
    actionType: ActionType;
    buttonId: string;
    handler: ActionHandler;
  }>
) {
  const { registerHandler, unregisterHandler } = useActions();

  useEffect(() => {
    // Register all handlers
    for (const { actionType, buttonId, handler } of handlers) {
      registerHandler(actionType, buttonId, handler);
    }

    // Cleanup: unregister all handlers
    return () => {
      for (const { actionType, buttonId } of handlers) {
        unregisterHandler(actionType, buttonId);
      }
    };
  }, [handlers, registerHandler, unregisterHandler]);
}
