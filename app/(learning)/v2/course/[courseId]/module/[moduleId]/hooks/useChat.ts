"use client";

import { useCallback, useRef, useState } from "react";
import { type MessageData, storeMessage } from "@/lib/chat/message-store";

let idCounter = 0;
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${++idCounter}`;
}

interface UseChatOptions {
  conversationId: string | null;
}

interface UseChatReturn {
  messages: MessageData[];
  isSending: boolean;
  addUserMessage: (
    text: string,
    messageType?: string,
    inputType?: string
  ) => Promise<string>;
  addAssistantMessage: (text: string, messageType?: string) => Promise<string>;
  lastAssistantMessageId: string | undefined;
  setMessages: React.Dispatch<React.SetStateAction<MessageData[]>>;
}

export function useChat({ conversationId }: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [isSending, setIsSending] = useState(false);
  const lastAssistantMessageIdRef = useRef<string | undefined>(undefined);

  // Ref for stable callbacks
  const conversationIdRef = useRef(conversationId);
  conversationIdRef.current = conversationId;

  const addUserMessage = useCallback(
    async (
      text: string,
      messageType = "general",
      inputType = "text"
    ): Promise<string> => {
      const convId = conversationIdRef.current;
      if (!convId) {
        console.error("[useChat] No conversation");
        return "";
      }

      const tempId = generateId("user");
      const userMessage: MessageData = {
        id: tempId,
        conversationId: convId,
        role: "user",
        content: text,
        inputType,
        messageType,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsSending(true);

      try {
        const saved = await storeMessage(convId, "user", text, {
          inputType,
          messageType,
        });
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, id: saved.id } : m))
        );
        return saved.id;
      } catch (error) {
        console.error("[useChat] Failed to store user message:", error);
        return tempId;
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  const addAssistantMessage = useCallback(
    async (text: string, messageType = "general"): Promise<string> => {
      const convId = conversationIdRef.current;
      if (!convId) {
        console.error("[useChat] No conversation");
        return "";
      }

      const tempId = generateId("assistant");
      lastAssistantMessageIdRef.current = tempId;

      const assistantMessage: MessageData = {
        id: tempId,
        conversationId: convId,
        role: "assistant",
        content: text,
        inputType: "text",
        messageType,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      try {
        const saved = await storeMessage(convId, "assistant", text, {
          inputType: "text",
          messageType,
        });
        lastAssistantMessageIdRef.current = saved.id;
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, id: saved.id } : m))
        );
        return saved.id;
      } catch (error) {
        console.error("[useChat] Failed to store assistant message:", error);
        return tempId;
      }
    },
    []
  );

  return {
    messages,
    isSending,
    addUserMessage,
    addAssistantMessage,
    lastAssistantMessageId: lastAssistantMessageIdRef.current,
    setMessages,
  };
}
