// providers/ActionsProvider.tsx
"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import type { ActionType } from "@/lib/actions/actionRegistry";

type ActionHandler = (
  metadata: Record<string, unknown>
) => void | Promise<void>;

interface ActionsContextType {
  handleButtonClick: (
    messageId: string,
    actionType: ActionType,
    buttonId: string,
    metadata: Record<string, unknown>
  ) => Promise<void>;
  registerHandler: (
    actionType: ActionType,
    buttonId: string,
    handler: ActionHandler
  ) => void;
  unregisterHandler: (actionType: ActionType, buttonId: string) => void;
}

const ActionsContext = createContext<ActionsContextType | null>(null);

interface ActionsProviderProps {
  children: ReactNode;
  onActionHandled?: (messageId: string, buttonId: string) => void;
}

export function ActionsProvider({
  children,
  onActionHandled,
}: ActionsProviderProps) {
  // Handler registry: Map<"actionType:buttonId", handler>
  const handlersRef = useRef<Map<string, ActionHandler>>(new Map());

  const registerHandler = useCallback(
    (actionType: ActionType, buttonId: string, handler: ActionHandler) => {
      const key = `${actionType}:${buttonId}`;
      handlersRef.current.set(key, handler);
    },
    []
  );

  const unregisterHandler = useCallback(
    (actionType: ActionType, buttonId: string) => {
      const key = `${actionType}:${buttonId}`;
      handlersRef.current.delete(key);
    },
    []
  );

  const handleButtonClick = useCallback(
    async (
      messageId: string,
      actionType: ActionType,
      buttonId: string,
      metadata: Record<string, unknown>
    ) => {
      const key = `${actionType}:${buttonId}`;
      const handler = handlersRef.current.get(key);

      if (handler) {
        try {
          await handler(metadata);
        } catch (error) {
          console.error(`[ActionsProvider] Handler error for ${key}:`, error);
        }
      } else {
        console.warn(`[ActionsProvider] No handler registered for ${key}`);
      }

      // Notify parent to update message status
      onActionHandled?.(messageId, buttonId);
    },
    [onActionHandled]
  );

  const value = useMemo<ActionsContextType>(
    () => ({ handleButtonClick, registerHandler, unregisterHandler }),
    [handleButtonClick, registerHandler, unregisterHandler]
  );

  return (
    <ActionsContext.Provider value={value}>{children}</ActionsContext.Provider>
  );
}

export function useActions() {
  const context = useContext(ActionsContext);
  if (!context) {
    throw new Error("useActions must be used within ActionsProvider");
  }
  return context;
}

// Helper hook for registering handlers with cleanup
export function useRegisterActionHandlers(
  handlers: Array<{
    actionType: ActionType;
    buttonId: string;
    handler: ActionHandler;
  }>
) {
  const { registerHandler, unregisterHandler } = useActions();

  useEffect(() => {
    for (const { actionType, buttonId, handler } of handlers) {
      registerHandler(actionType, buttonId, handler);
    }

    return () => {
      for (const { actionType, buttonId } of handlers) {
        unregisterHandler(actionType, buttonId);
      }
    };
  }, [handlers, registerHandler, unregisterHandler]);
}
