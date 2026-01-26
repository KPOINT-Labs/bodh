"use client";

import { useEffect, useRef } from "react";
import { ErrorMessage } from "@/components/feedback/ErrorMessage";
import { SuccessMessage } from "@/components/feedback/SuccessMessage";
import { useMessages } from "../providers/MessagesProvider";
import { ChatMessage } from "./ChatMessage";
import { QuizQuestion } from "./QuizQuestion";

export function ChatPanel() {
  const {
    allItems,
    isLoading,
    submitQuizAnswer,
    skipQuizQuestion,
    isQuizProcessing,
    showSuccessToast,
    showErrorToast,
    setShowSuccessToast,
    setShowErrorToast,
  } = useMessages();

  // Auto-scroll to bottom when new items arrive
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom on new items
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allItems.length]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>Loading conversation...</span>
        </div>
      </div>
    );
  }

  if (allItems.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-center text-muted-foreground">
          Start your learning journey! The tutor will guide you through the
          material.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
        <div className="space-y-4">
          {allItems.map((item) =>
            item.type === "message" ? (
              <ChatMessage key={item.data.id} message={item.data} />
            ) : (
              <QuizQuestion
                disabled={isQuizProcessing}
                key={item.data.id}
                onAnswer={submitQuizAnswer}
                onSkip={skipQuizQuestion}
                question={item.data}
              />
            )
          )}
        </div>
        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* Toast portals from @/components/feedback/ */}
      <SuccessMessage
        message="Great job!"
        onClose={() => setShowSuccessToast(false)}
        show={showSuccessToast}
      />
      <ErrorMessage
        message="Not quite correct!"
        onClose={() => setShowErrorToast(false)}
        show={showErrorToast}
      />
    </>
  );
}
