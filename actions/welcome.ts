"use server";

/**
 * Welcome Message Generator - Server Action
 *
 * Generates LLM-based welcome messages exactly like BODH agent.py.
 * Source: /home/aditya/kpoint/prism2/app/agents/livekit/bodh/agent.py
 * Lines 609-761
 */

import OpenAI from "openai";
import {
  type SessionType,
  getCourseWelcomePrompt,
  getCourseWelcomeBackPrompt,
  getLessonWelcomePrompt,
  getLessonWelcomeBackPrompt,
  getFallbackCourseWelcome,
  getFallbackCourseWelcomeBack,
  getFallbackLessonWelcome,
  getFallbackLessonWelcomeBack,
} from "@/lib/welcome/prompts";

const openai = new OpenAI();

export interface WelcomeContext {
  sessionType: SessionType;
  userName?: string;
  // Course context
  courseTitle?: string;
  courseDescription?: string;
  learningObjectives?: string;
  // Lesson context
  lessonTitle?: string;
  lessonNumber?: number;
  prevLessonTitle?: string;
  // Course welcome back context
  completedLessons?: number;
  totalLessons?: number;
  lastLessonTitle?: string;
  // Lesson welcome back context
  completionPercentage?: number;
  lastPosition?: number;
}

/**
 * Generate a welcome message using LLM.
 * Exact port of BODH agent.py _generate_greeting and _generate_*_message methods.
 */
export async function generateWelcomeMessage(
  context: WelcomeContext
): Promise<string> {
  // Personalized greeting prefix (agent.py lines 583-586)
  const base = context.userName ? `Hi ${context.userName}! ` : "Hi there! ";

  try {
    let prompt: string;
    let formatMessage: (generatedText: string) => string;

    switch (context.sessionType) {
      case "course_welcome":
        // agent.py _generate_welcome_message (lines 609-651)
        prompt = getCourseWelcomePrompt(
          context.courseTitle || "this course",
          context.learningObjectives || null,
          context.courseDescription || null
        );
        formatMessage = (text) =>
          `${base}Welcome to ${context.courseTitle}! ${text} I'm Aditi, your AI learning companion. Feel free to ask me any questions!`;
        break;

      case "course_welcome_back":
        // agent.py _generate_welcome_back_message (lines 653-689)
        prompt = getCourseWelcomeBackPrompt(
          context.courseTitle || "this course",
          context.completedLessons ?? null,
          context.totalLessons ?? null,
          context.lastLessonTitle ?? null
        );
        formatMessage = (text) => `${base}${text}`;
        break;

      case "lesson_welcome":
        // agent.py _generate_lesson_welcome_message (lines 691-727)
        prompt = getLessonWelcomePrompt(
          context.lessonNumber || 2,
          context.lessonTitle || "this lesson",
          context.prevLessonTitle || null
        );
        formatMessage = (text) => `${base}${text}`;
        break;

      case "lesson_welcome_back":
        // agent.py _generate_lesson_welcome_back_message (lines 729-761)
        prompt = getLessonWelcomeBackPrompt(
          context.lessonTitle || "this lesson",
          context.completionPercentage ?? null,
          context.lastPosition ?? null
        );
        formatMessage = (text) => `${base}${text}`;
        break;

      default:
        return getFallbackMessage(base, context);
    }

    // Call OpenAI (same model as LIVEKIT_LLM_MODEL in agent.py)
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.7,
    });

    const generatedText = response.choices[0]?.message?.content?.trim();

    if (generatedText) {
      return formatMessage(generatedText);
    }
  } catch (error) {
    console.error("[generateWelcomeMessage] Failed to generate with LLM:", error);
  }

  // Fallback to static message
  return getFallbackMessage(base, context);
}

/**
 * Get fallback message when LLM fails.
 * Port of agent.py _build_fallback_* functions (lines 763-814)
 */
function getFallbackMessage(base: string, context: WelcomeContext): string {
  switch (context.sessionType) {
    case "course_welcome":
      return getFallbackCourseWelcome(base, context.courseTitle || "this course");

    case "course_welcome_back":
      return getFallbackCourseWelcomeBack(
        base,
        context.courseTitle || "this course",
        context.completedLessons,
        context.totalLessons,
        context.lastLessonTitle
      );

    case "lesson_welcome":
      return getFallbackLessonWelcome(
        base,
        context.lessonNumber || 2,
        context.prevLessonTitle || null
      );

    case "lesson_welcome_back":
      return getFallbackLessonWelcomeBack(
        base,
        context.lessonTitle || "this lesson",
        context.completionPercentage ?? null
      );

    default:
      return `${base}Welcome! I'm Aditi, your AI learning companion. Feel free to ask me any questions!`;
  }
}
