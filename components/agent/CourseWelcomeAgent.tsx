"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Sparkles, RotateCcw, User } from "lucide-react";
import {
  initializeChatSession,
  storeMessage,
  type MessageData,
} from "@/lib/chat/message-store";

interface Lesson {
  id: string;
  title: string;
  orderIndex: number;
  kpointVideoId?: string | null;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description?: string | null;
  learningObjectives?: string[];
}

interface CourseWelcomeAgentProps {
  course: Course;
  module: Module;
  userId: string;
  onLessonSelect: (lesson: Lesson) => void;
  onConversationReady?: (conversationId: string) => void;
  chatMessages?: MessageData[];
  isWaitingForResponse?: boolean;
}

// Helper to render message content with formatting
function MessageContent({ content }: { content: string }) {
  return (
    <div className="text-sm leading-relaxed">
      {content.split("\n").map((line, index) => {
        // Check if line is a bullet point
        if (line.trim().startsWith("•")) {
          return (
            <div key={index} className="flex items-start gap-2 ml-2 my-1">
              <span className="text-blue-500 shrink-0">•</span>
              <span>{line.trim().substring(1).trim()}</span>
            </div>
          );
        }
        // Check if line is "You'll learn:" header
        if (line.trim().toLowerCase().includes("you'll learn")) {
          return (
            <p key={index} className="font-semibold text-gray-900 mt-3 mb-1">
              {line}
            </p>
          );
        }
        // Regular paragraph
        return line.trim() ? (
          <p key={index} className={index > 0 ? "mt-2" : ""}>
            {line}
          </p>
        ) : null;
      })}
    </div>
  );
}

export function CourseWelcomeAgent({
  course,
  module,
  userId,
  onLessonSelect,
  onConversationReady,
  chatMessages = [],
  isWaitingForResponse = false,
}: CourseWelcomeAgentProps) {
  const [historyMessages, setHistoryMessages] = useState<MessageData[]>([]);
  const [latestMessage, setLatestMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [isReturningUser, setIsReturningUser] = useState(false);
  const hasInitialized = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get the first lesson from the module
  const firstLesson = module.lessons.sort(
    (a, b) => a.orderIndex - b.orderIndex
  )[0];

  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    async function initializeChat() {
      try {
        // Step 1: Initialize chat session (get/create thread and conversation)
        const { conversation } = await initializeChatSession({
          userId,
          moduleId: module.id,
          contextType: "welcome",
        });

        // Notify parent that conversation is ready
        if (onConversationReady) {
          onConversationReady(conversation.id);
        }

        // Step 2: Check if this is a returning user (has existing messages)
        if (conversation.messages.length > 0) {
          // Returning user - load all previous messages
          setIsReturningUser(true);
          setHistoryMessages(conversation.messages);

          // Generate welcome back message
          const response = await fetch("/api/agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "welcome_back",
              context: {
                courseTitle: course.title,
                moduleTitle: module.title,
                lastLesson: firstLesson?.title,
              },
            }),
          });

          const data = await response.json();
          if (data.success) {
            setLatestMessage(data.message);
          } else {
            setLatestMessage(
              `Welcome back! Ready to continue with ${module.title}?`
            );
          }

          setIsLoading(false);
          setIsTyping(true);
        } else {
          // First-time user - generate and store welcome message
          setIsReturningUser(false);

          const response = await fetch("/api/agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "welcome",
              context: {
                courseTitle: course.title,
                courseDescription: course.description,
                learningObjectives: course.learningObjectives,
                moduleTitle: module.title,
                lessonTitle: firstLesson?.title,
                lessonNumber: firstLesson ? firstLesson.orderIndex + 1 : undefined,
              },
            }),
          });

          const data = await response.json();
          let welcomeMessage: string;

          if (data.success) {
            welcomeMessage = data.message;
          } else {
            throw new Error(data.error || "Failed to generate summary");
          }

          // Store the welcome message in the database
          const fullMessage = `Welcome to ${course.title}!\n${welcomeMessage}`;
          await storeMessage(conversation.id, "assistant", fullMessage);

          setLatestMessage(fullMessage);
          setIsLoading(false);
          setIsTyping(true);
        }
      } catch (error) {
        console.error("Failed to initialize chat session:", error);
        const fallbackMessage =
          course.description ||
          "Welcome to this course! Let's begin your learning journey.";
        setLatestMessage(fallbackMessage);
        setIsLoading(false);
        setIsTyping(true);
      }
    }

    initializeChat();
  }, [course, module, userId, firstLesson, onConversationReady]);

  // Auto-scroll when chat messages change
  useEffect(() => {
    if (chatMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  // Scroll to bottom when loading completes (initial page load)
  useEffect(() => {
    if (!isLoading) {
      // Small delay to ensure content is rendered
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [isLoading]);

  // Typing effect for the latest message
  useEffect(() => {
    if (!isTyping || !latestMessage) return;

    let currentIndex = 0;

    const typingInterval = setInterval(() => {
      if (currentIndex <= latestMessage.length) {
        setDisplayedText(latestMessage.slice(0, currentIndex));
        currentIndex++;
        // Scroll during typing to keep content visible
        if (currentIndex % 50 === 0) {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      } else {
        clearInterval(typingInterval);
        setIsTyping(false);
        // Final scroll when typing completes
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }, 10);

    return () => clearInterval(typingInterval);
  }, [isTyping, latestMessage]);

  const handleStartLesson = () => {
    if (firstLesson) {
      onLessonSelect(firstLesson);
    }
  };

  const handleContinueFromLastLesson = () => {
    // TODO: Get actual last lesson from progress and navigate to it
    if (firstLesson) {
      onLessonSelect(firstLesson);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-gray-900">AI Learning Assistant</p>
            <p className="text-sm text-gray-500">
              {isReturningUser
                ? "Welcome back! Loading your conversation..."
                : "Preparing your personalized welcome message..."}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-gray-200 shadow-sm p-6">
      {/* Agent Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">AI Learning Assistant</p>
          <p className="text-xs text-gray-500">Your personal guide</p>
        </div>
      </div>

      {/* All Messages in One Conversation Flow */}
      <div className="space-y-4">
        {/* History Messages (from database) */}
        {historyMessages.length > 0 && (
          <div className="space-y-4">
            {historyMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${
                  msg.role === "user" ? "justify-end" : ""
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                )}
                <div
                  className={`${
                    msg.role === "user"
                      ? "bg-gray-100 text-gray-900 rounded-2xl rounded-tr-sm px-4 py-2 max-w-[75%]"
                      : "bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] text-gray-800"
                  }`}
                >
                  <MessageContent content={msg.content} />
                </div>
                {msg.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Current/Latest Message (Welcome or Welcome Back) */}
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
            <div className="text-sm leading-relaxed text-gray-800">
              {displayedText.split("\n").map((line, index) => {
                if (line.trim().startsWith("•")) {
                  return (
                    <div key={index} className="flex items-start gap-2 ml-2 my-1">
                      <span className="text-blue-500 shrink-0">•</span>
                      <span>{line.trim().substring(1).trim()}</span>
                    </div>
                  );
                }
                if (line.trim().toLowerCase().includes("you'll learn")) {
                  return (
                    <p key={index} className="font-semibold text-gray-900 mt-3 mb-1">
                      {line}
                    </p>
                  );
                }
                return line.trim() ? (
                  <p key={index} className={index > 0 ? "mt-2" : ""}>
                    {line}
                  </p>
                ) : null;
              })}
              {isTyping && (
                <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5" />
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {!isTyping && firstLesson && (
          <div className="pt-4 ml-11 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {isReturningUser ? (
              <>
                <p className="text-sm font-medium text-gray-700">
                  Would you like to continue where you left off?
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleContinueFromLastLesson}
                    className="gap-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full px-5"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Continue Learning
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleStartLesson}
                    className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-full px-5"
                  >
                    <Play className="h-4 w-4" />
                    Start from Beginning
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700">
                  Let&apos;s start with{" "}
                  <span className="text-blue-500 font-semibold">
                    Lesson {firstLesson.orderIndex + 1}: {firstLesson.title}
                  </span>{" "}
                  from <span className="text-blue-500 font-semibold">{module.title}</span>
                </p>
                <Button
                  onClick={handleStartLesson}
                  className="gap-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full px-5"
                >
                  <Play className="h-4 w-4" />
                  Start Lesson
                </Button>
              </>
            )}
          </div>
        )}

        {/* Chat Messages (from current session) */}
        {chatMessages.length > 0 && (
          <div className="space-y-4 pt-4 mt-4 border-t border-gray-100">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${
                  msg.role === "user" ? "justify-end" : ""
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                )}
                <div
                  className={`${
                    msg.role === "user"
                      ? "bg-gray-100 text-gray-900 rounded-2xl rounded-tr-sm px-4 py-2 max-w-[75%]"
                      : "bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] text-gray-800"
                  }`}
                >
                  <MessageContent content={msg.content} />
                </div>
                {msg.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Typing Indicator - shown when waiting for response */}
        {isWaitingForResponse && (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        {!isTyping && !firstLesson && (
          <p className="text-sm text-gray-500 ml-11">
            No lessons available in this module yet. Please check back later.
          </p>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </Card>
  );
}
