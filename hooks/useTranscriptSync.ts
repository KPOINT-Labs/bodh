"use client";

import { useCallback, useRef } from "react";
import type { TranscriptSegment, UserTranscription } from "@/hooks/useLiveKit";

interface UseTranscriptSyncProps {
  isReturningUser: boolean;
  addAssistantMessage: (
    message: string,
    messageType?: string
  ) => Promise<string | undefined>;
  clearAgentTranscript: () => void;
  clearUserTranscript: () => void;
  showAction: (
    type: string,
    metadata?: Record<string, unknown>,
    anchorMessageId?: string
  ) => void;
  getLastAssistantMessageId: () => string | undefined;
  handleAddUserMessage: (
    message: string,
    messageType?: string,
    inputType?: string
  ) => Promise<void>;
}

export function useTranscriptSync({
  isReturningUser,
  addAssistantMessage,
  clearAgentTranscript,
  clearUserTranscript,
  showAction,
  getLastAssistantMessageId,
  handleAddUserMessage,
}: UseTranscriptSyncProps) {
  const storedSegmentsRef = useRef<Set<string>>(new Set());
  const storedVoiceMessagesRef = useRef<Set<string>>(new Set());
  const userHasSentMessageRef = useRef<boolean>(false);
  const lastUserMessageTypeRef = useRef<string>("general");
  const welcomeStoredRef = useRef<boolean>(false);
  const welcomeMessageIdRef = useRef<string | undefined>(undefined);
  const isReturningUserRef = useRef<boolean>(isReturningUser);

  isReturningUserRef.current = isReturningUser;

  const handleUserTranscriptCallback = useCallback(
    (transcription: UserTranscription) => {
      console.log("[useTranscriptSync] User transcription:", {
        text: transcription.text.substring(0, 50),
        isFinal: transcription.isFinal,
        inputType: transcription.inputType,
      });

      if (!transcription.text.trim()) {
        return;
      }

      if (transcription.isFinal) {
        const messageKey = transcription.text.trim();
        if (storedVoiceMessagesRef.current.has(messageKey)) {
          console.log(
            "[useTranscriptSync] Voice message already stored, skipping:",
            messageKey.substring(0, 30)
          );
          return;
        }
        storedVoiceMessagesRef.current.add(messageKey);

        userHasSentMessageRef.current = true;
        lastUserMessageTypeRef.current = "general";

        console.log(
          "[useTranscriptSync] Storing voice message:",
          transcription.text.substring(0, 50)
        );
        handleAddUserMessage(transcription.text, "general", "voice");

        setTimeout(() => {
          clearUserTranscript();
        }, 100);
      }
    },
    [handleAddUserMessage, clearUserTranscript]
  );

  const handleTranscriptCallback = useCallback(
    async (segment: TranscriptSegment) => {
      console.log("[useTranscriptSync] Transcript callback:", {
        isFinal: segment.isFinal,
        isAgent: segment.isAgent,
        textLength: segment.text?.length,
        userHasSent: userHasSentMessageRef.current,
        welcomeStored: welcomeStoredRef.current,
        isReturning: isReturningUserRef.current,
      });

      if (!(segment.isAgent && segment.text.trim())) {
        return;
      }

      if (
        segment.text.startsWith("We've just completed a full idea covering")
      ) {
        if (segment.isFinal) {
          const text = segment.text;
          const topicRegex = /covering ([^.]+)\. Let's do a quick check/;
          const match = text.match(topicRegex);
          if (match?.[1]) {
            const topic = match[1];
            console.log(
              "[useTranscriptSync] FA intro transcript detected, topic:",
              topic
            );

            const faMessageId = await addAssistantMessage(text, "fa");

            const lastAssistantId = getLastAssistantMessageId();
            const anchorMessageId =
              faMessageId ?? lastAssistantId ?? `fa-intro-${segment.id}`;

            showAction(
              "fa_intro",
              { topic, introMessage: text },
              anchorMessageId
            );

            setTimeout(() => {
              clearAgentTranscript();
            }, 100);
          }
        }
        return;
      }

      if (segment.isFinal) {
        const segmentKey = `${segment.id}-${segment.text.length}`;
        if (storedSegmentsRef.current.has(segmentKey)) {
          console.log("[useTranscriptSync] Segment already stored, skipping");
          return;
        }

        if (!(userHasSentMessageRef.current || welcomeStoredRef.current)) {
          if (isReturningUserRef.current) {
            welcomeStoredRef.current = true;
            console.log(
              "[useTranscriptSync] Welcome_back message handled for returning user"
            );
            setTimeout(() => {
              clearAgentTranscript();
            }, 500);
          } else {
            storedSegmentsRef.current.add(segmentKey);
            welcomeStoredRef.current = true;
            console.log(
              "[useTranscriptSync] Storing welcome message for first-time user"
            );
            const savedMessageId = await addAssistantMessage(
              segment.text,
              "general"
            );
            welcomeMessageIdRef.current = savedMessageId;
            setTimeout(() => {
              clearAgentTranscript();
            }, 500);
          }
          return;
        }

        if (userHasSentMessageRef.current) {
          storedSegmentsRef.current.add(segmentKey);
          const responseType = lastUserMessageTypeRef.current;
          console.log(
            "[useTranscriptSync] Storing agent response with type:",
            responseType
          );
          addAssistantMessage(segment.text, responseType);
          clearAgentTranscript();
        } else {
          console.log(
            "[useTranscriptSync] Transcript received but not storing (welcome done, no user message)"
          );
        }
      }
    },
    [
      addAssistantMessage,
      clearAgentTranscript,
      showAction,
      getLastAssistantMessageId,
    ]
  );

  const handleFAIntroComplete = useCallback(
    async (data: { topic: string; introMessage: string }) => {
      console.log("[useTranscriptSync] FA intro complete, topic:", data.topic);

      let faMessageId: string | undefined;
      if (data.introMessage) {
        faMessageId = await addAssistantMessage(data.introMessage, "fa");
      }

      const lastAssistantId = getLastAssistantMessageId();
      const anchorMessageId = faMessageId ?? lastAssistantId;
      showAction(
        "fa_intro",
        { topic: data.topic, introMessage: data.introMessage },
        anchorMessageId
      );
    },
    [addAssistantMessage, showAction, getLastAssistantMessageId]
  );

  const markUserInteracted = useCallback((messageType = "general") => {
    userHasSentMessageRef.current = true;
    lastUserMessageTypeRef.current = messageType;
  }, []);

  return {
    handleUserTranscriptCallback,
    handleTranscriptCallback,
    handleFAIntroComplete,
    markUserInteracted,
    welcomeMessageIdRef,
    welcomeStoredRef,
    userHasSentMessageRef,
  };
}
