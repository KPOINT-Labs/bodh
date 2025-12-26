"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Sparkles } from "lucide-react";

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
  onLessonSelect: (lesson: Lesson) => void;
}

export function CourseWelcomeAgent({
  course,
  module,
  onLessonSelect,
}: CourseWelcomeAgentProps) {
  const [summary, setSummary] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [displayedText, setDisplayedText] = useState("");

  // Get the first lesson from the module
  const firstLesson = module.lessons.sort(
    (a, b) => a.orderIndex - b.orderIndex
  )[0];

  useEffect(() => {
    async function fetchSummary() {
      try {
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
        if (data.success) {
          setSummary(data.message);
        } else {
          throw new Error(data.error || "Failed to generate summary");
        }
        setIsLoading(false);
        setIsTyping(true);
      } catch (error) {
        console.error("Failed to fetch course summary:", error);
        setSummary(
          course.description ||
            "Welcome to this course! Let's begin your learning journey."
        );
        setIsLoading(false);
        setIsTyping(true);
      }
    }

    fetchSummary();
  }, [course, module.title, firstLesson]);

  // Typing effect for the agent message
  useEffect(() => {
    if (!isTyping || !summary) return;

    const fullMessage = `Welcome to ${course.title}!\n${summary}`;
    let currentIndex = 0;

    const typingInterval = setInterval(() => {
      if (currentIndex <= fullMessage.length) {
        setDisplayedText(fullMessage.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        setIsTyping(false);
      }
    }, 10);

    return () => clearInterval(typingInterval);
  }, [isTyping, summary, course.title]);

  const handleStartLesson = () => {
    if (firstLesson) {
      onLessonSelect(firstLesson);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-background p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">AI Learning Assistant</p>
            <p className="text-sm text-muted-foreground">
              Preparing your personalized welcome message...
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-background p-6 space-y-4">
      {/* Agent Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">AI Learning Assistant</p>
          <p className="text-xs text-muted-foreground">Your personal guide</p>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="space-y-4">
        <div className="text-sm leading-relaxed text-foreground">
          {displayedText.split('\n').map((line, index) => {
            // Check if line is a bullet point
            if (line.trim().startsWith('•')) {
              return (
                <div key={index} className="flex items-start gap-2 ml-2 my-1">
                  <span className="text-primary shrink-0">•</span>
                  <span>{line.trim().substring(1).trim()}</span>
                </div>
              );
            }
            // Check if line is "You'll learn:" header
            if (line.trim().toLowerCase().includes("you'll learn")) {
              return (
                <p key={index} className="font-medium mt-3 mb-1">
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
          {isTyping && (
            <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />
          )}
        </div>

        {/* Lesson Link Section */}
        {!isTyping && firstLesson && (
          <div className="pt-2 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <p className="text-sm font-medium text-foreground">
              Let's start with{" "}
              <span className="text-primary">
                Lesson {firstLesson.orderIndex + 1}: {firstLesson.title}
              </span>{" "}
              from <span className="text-primary">{module.title}</span>
            </p>

            <Button
              onClick={handleStartLesson}
              className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              <Play className="h-4 w-4" />
              Start Lesson
            </Button>
          </div>
        )}

        {!isTyping && !firstLesson && (
          <p className="text-sm text-muted-foreground">
            No lessons available in this module yet. Please check back later.
          </p>
        )}
      </div>
    </Card>
  );
}
