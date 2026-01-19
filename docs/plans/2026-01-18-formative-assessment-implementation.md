# Formative Assessment System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a unified assessment system with warmup quizzes, concept checks, in-lesson questions, formative assessments, and learning summaries.

**Architecture:** React context manages assessment session state. Video player triggers assessments at timestamps. Frontend sends assessment messages to BODH agent via LiveKit. Agent responds with questions/feedback via data channel. All attempts stored in PostgreSQL.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma 7, LiveKit, TailwindCSS, shadcn/ui

**Sarvam Response Parsing:** Reuse existing `detectAnswerFeedback()` from `lib/chat/assessment.ts` for determining `isCorrect` from Sarvam's natural language responses. This function uses keyword pattern matching (correct: 'correct', 'that's right', etc. | incorrect: 'incorrect', 'not quite', etc.) within first 200 characters.

---

## Phase 1: Foundation (Types & Database)

### Task 1: Create Assessment Types

**Files:**
- Create: `types/assessment.ts`

**Step 1: Create the types file**

```typescript
// types/assessment.ts

/**
 * Chapter definition within a lesson video
 */
export interface Chapter {
  id: string;
  title: string;
  start_timestamp: number;
  end_timestamp: number;
  description: string;
  concept_check_enabled: boolean;
}

/**
 * Quiz question with predefined options and feedback (warmup, formative)
 */
export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  correct_option: string;
  feedback: string;
  chapter_id?: string;
}

export interface QuizOption {
  id: string;
  text: string;
}

/**
 * In-lesson question from professor (MCQ or text response)
 */
export interface InlessonQuestion {
  id: string;
  question: string;
  timestamp: number;
  type: "mcq" | "text";
  options?: QuizOption[];
  correct_option?: string;
  chapter_id?: string;
}

/**
 * Complete quiz structure stored in Lesson.quiz JSON field
 */
export interface LessonQuiz {
  chapters: Chapter[];
  warmup: QuizQuestion[];
  inlesson: InlessonQuestion[];
}

/**
 * User's answer to a quiz question
 */
export interface QuizAnswer {
  questionId: string;
  selectedOption: string;
  isCorrect: boolean;
  chapter_id?: string;
  timestamp: Date;
}

/**
 * Assessment session state for a lesson
 */
export interface AssessmentSessionState {
  lessonId: string;
  odataUserId: string;
  phase: AssessmentPhase;
  warmup: WarmupState;
  conceptChecks: Record<string, ConceptCheckState>;
  inlesson: Record<string, InlessonState>;
  formative: FormativeState;
}

export type AssessmentPhase =
  | "idle"
  | "warmup"
  | "video"
  | "concept_check"
  | "inlesson"
  | "formative"
  | "summary";

export interface WarmupState {
  currentIndex: number;
  answers: QuizAnswer[];
  completed: boolean;
  skipped: boolean;
}

export interface ConceptCheckState {
  answers: QuizAnswer[];
  completed: boolean;
  skipped: boolean;
}

export interface InlessonState {
  response: string;
  responseType: "voice" | "text";
  aiEvaluation?: string;
  isCorrect?: boolean;
  completed: boolean;
  skipped: boolean;
}

export interface FormativeState {
  currentIndex: number;
  answers: QuizAnswer[];
  completed: boolean;
  skipped: boolean;
}

/**
 * Learning summary generated from assessment session
 */
export interface LearningSummary {
  chaptersUnderstood: ChapterResult[];
  chaptersToReview: ChapterResult[];
  overallScore: number;
  totalQuestions: number;
  correctAnswers: number;
  skippedQuestions: number;
}

export interface ChapterResult {
  id: string;
  title: string;
  correctRate: number;
  suggestedAids?: SuggestedAid[];
}

export interface SuggestedAid {
  type: "summary" | "reel" | "practice";
  title: string;
  duration: string;
  url?: string;
}

/**
 * Assessment message types for agent communication
 */
export type AssessmentMessageType =
  | "WARMUP_START"
  | "WARMUP_ANSWER"
  | "WARMUP_SKIP"
  | "CONCEPT_CHECK"
  | "CONCEPT_CHECK_ANSWER"
  | "CONCEPT_CHECK_SKIP"
  | "INLESSON"
  | "INLESSON_ANSWER"
  | "INLESSON_SKIP"
  | "FORMATIVE_START"
  | "FORMATIVE_ANSWER"
  | "FORMATIVE_SKIP";

export interface AssessmentMessage {
  type: AssessmentMessageType;
  data: Record<string, unknown>;
}

/**
 * Agent response for assessment
 */
export interface AssessmentResponse {
  type: "assessment_message";
  role: "assistant";
  text: string;
  questionData?: QuizQuestion | InlessonQuestion;
  feedbackData?: {
    isCorrect: boolean;
    feedback: string;
  };
  summaryData?: LearningSummary;
}
```

**Step 2: Commit**

```bash
git add types/assessment.ts
git commit -m "feat(types): add assessment type definitions"
```

---

### Task 2: Add Prisma Models for Assessment

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add AssessmentAttempt and AssessmentSession models**

Add after the `TTSCache` model at line 309:

```prisma
model AssessmentAttempt {
  id             String   @id @default(cuid())
  userId         String
  lessonId       String
  assessmentType String   // "warmup" | "concept_check" | "inlesson" | "formative"
  questionId     String
  questionText   String   @db.Text
  userAnswer     String
  correctAnswer  String?
  isCorrect      Boolean?
  isSkipped      Boolean  @default(false)
  feedback       String?  @db.Text
  feedbackSource String   // "db" | "sarvam_qna" | "sarvam_fa"
  chapterId      String?
  createdAt      DateTime @default(now())

  @@index([userId, lessonId])
  @@index([userId, lessonId, assessmentType])
}

model AssessmentSession {
  id                     String    @id @default(cuid())
  userId                 String
  lessonId               String
  phase                  String    @default("idle")
  warmupCompleted        Boolean   @default(false)
  warmupSkipped          Boolean   @default(false)
  conceptChecksCompleted String[]  @default([])
  inlessonCompleted      String[]  @default([])
  formativeCompleted     Boolean   @default(false)
  formativeSkipped       Boolean   @default(false)
  startedAt              DateTime  @default(now())
  completedAt            DateTime?

  @@unique([userId, lessonId])
  @@index([userId])
  @@index([lessonId])
}
```

**Step 1.1: Add relations to User model (if User model exists)**

If the project has a User model, add the relation. Otherwise, skip this step (userId will be stored as String without foreign key constraint).

Find the User model and add:

```prisma
model User {
  // ... existing fields ...

  // Add these relations
  assessmentAttempts  AssessmentAttempt[]
  assessmentSessions  AssessmentSession[]
}
```

Then update the assessment models to include the relation:

```prisma
model AssessmentAttempt {
  // ... existing fields ...
  userId         String
  user           User?   @relation(fields: [userId], references: [id], onDelete: Cascade)
  // ...
}

model AssessmentSession {
  // ... existing fields ...
  userId         String
  user           User?   @relation(fields: [userId], references: [id], onDelete: Cascade)
  // ...
}
```

**Note:** If the project stores userId as an external reference (e.g., from NextAuth or odata), relations may not be possible. In that case, the userId fields remain as plain Strings without foreign key constraints. Check the existing schema to determine the correct approach.

**Step 2: Push schema changes to database**

```bash
./node_modules/.bin/prisma db push
```

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(db): add AssessmentAttempt and AssessmentSession models"
```

---

### Task 3: Create Assessment Server Actions

**Files:**
- Create: `actions/assessment.ts`

**Step 1: Create the server actions file**

```typescript
// actions/assessment.ts
"use server";

import { prisma } from "@/lib/prisma";
import { detectAnswerFeedback } from "@/lib/chat/assessment";
import type { LearningSummary, LessonQuiz, ChapterResult } from "@/types/assessment";

/**
 * Parse Sarvam response to extract isCorrect and feedback
 * Uses existing detectAnswerFeedback() which checks for patterns like:
 * - Correct: 'correct', 'that's right', 'exactly', 'well done', etc.
 * - Incorrect: 'incorrect', 'not quite', 'wrong', 'actually', etc.
 */
export function parseSarvamFeedback(sarvamResponse: string): {
  isCorrect: boolean | null;
  feedback: string;
} {
  const result = detectAnswerFeedback(sarvamResponse);
  return {
    isCorrect: result.type === 'correct' ? true : result.type === 'incorrect' ? false : null,
    feedback: sarvamResponse, // Display full Sarvam response as feedback
  };
}

/**
 * Result type for server actions with error handling
 */
type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

/**
 * Configuration constants for assessment system
 * These can be moved to environment variables or a config file if needed
 */
const ASSESSMENT_CONFIG = {
  /** Minimum correct rate to consider a chapter "understood" (70%) */
  CHAPTER_UNDERSTANDING_THRESHOLD: 0.7,
  /** Maximum questions per concept check */
  MAX_CONCEPT_CHECK_QUESTIONS: 2,
  /** Maximum questions per formative assessment */
  MAX_FORMATIVE_QUESTIONS: 5,
};

/**
 * Get or create assessment session for a user+lesson
 */
export async function getOrCreateAssessmentSession(
  userId: string,
  lessonId: string
): Promise<ActionResult<Awaited<ReturnType<typeof prisma.assessmentSession.findUnique>>>> {
  try {
    const existing = await prisma.assessmentSession.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });

    if (existing) {
      return { success: true, data: existing };
    }

    const created = await prisma.assessmentSession.create({
      data: {
        userId,
        lessonId,
        phase: "idle",
      },
    });
    return { success: true, data: created };
  } catch (error) {
    console.error("[getOrCreateAssessmentSession] Error:", error);
    return { success: false, error: "Failed to get or create assessment session" };
  }
}

/**
 * Update assessment session phase
 */
export async function updateAssessmentPhase(
  userId: string,
  lessonId: string,
  phase: string
): Promise<ActionResult<null>> {
  try {
    await prisma.assessmentSession.update({
      where: { userId_lessonId: { userId, lessonId } },
      data: { phase },
    });
    return { success: true, data: null };
  } catch (error) {
    console.error("[updateAssessmentPhase] Error:", error);
    return { success: false, error: "Failed to update assessment phase" };
  }
}

/**
 * Mark warmup as completed or skipped
 */
export async function completeWarmup(
  userId: string,
  lessonId: string,
  skipped: boolean
): Promise<ActionResult<null>> {
  try {
    await prisma.assessmentSession.update({
      where: { userId_lessonId: { userId, lessonId } },
      data: {
        warmupCompleted: !skipped,
        warmupSkipped: skipped,
        phase: "video",
      },
    });
    return { success: true, data: null };
  } catch (error) {
    console.error("[completeWarmup] Error:", error);
    return { success: false, error: "Failed to complete warmup" };
  }
}

/**
 * Mark concept check as completed
 */
export async function completeConceptCheck(
  userId: string,
  lessonId: string,
  chapterId: string,
  skipped: boolean
): Promise<ActionResult<null>> {
  try {
    const session = await prisma.assessmentSession.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });

    const completed = session?.conceptChecksCompleted || [];
    if (!completed.includes(chapterId)) {
      completed.push(chapterId);
    }

    await prisma.assessmentSession.update({
      where: { userId_lessonId: { userId, lessonId } },
      data: {
        conceptChecksCompleted: completed,
        phase: "video",
      },
    });
    return { success: true, data: null };
  } catch (error) {
    console.error("[completeConceptCheck] Error:", error);
    return { success: false, error: "Failed to complete concept check" };
  }
}

/**
 * Mark inlesson question as completed
 */
export async function completeInlesson(
  userId: string,
  lessonId: string,
  questionId: string
): Promise<ActionResult<null>> {
  try {
    const session = await prisma.assessmentSession.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });

    const completed = session?.inlessonCompleted || [];
    if (!completed.includes(questionId)) {
      completed.push(questionId);
    }

    await prisma.assessmentSession.update({
      where: { userId_lessonId: { userId, lessonId } },
      data: {
        inlessonCompleted: completed,
        phase: "video",
      },
    });
    return { success: true, data: null };
  } catch (error) {
    console.error("[completeInlesson] Error:", error);
    return { success: false, error: "Failed to complete inlesson question" };
  }
}

/**
 * Mark formative assessment as completed
 */
export async function completeFormative(
  userId: string,
  lessonId: string,
  skipped: boolean
): Promise<ActionResult<null>> {
  try {
    await prisma.assessmentSession.update({
      where: { userId_lessonId: { userId, lessonId } },
      data: {
        formativeCompleted: !skipped,
        formativeSkipped: skipped,
        phase: "summary",
        completedAt: new Date(),
      },
    });
    return { success: true, data: null };
  } catch (error) {
    console.error("[completeFormative] Error:", error);
    return { success: false, error: "Failed to complete formative assessment" };
  }
}

/**
 * Store an assessment attempt
 */
export async function storeAssessmentAttempt(data: {
  userId: string;
  lessonId: string;
  assessmentType: string;
  questionId: string;
  questionText: string;
  userAnswer: string;
  correctAnswer?: string;
  isCorrect?: boolean;
  isSkipped?: boolean;
  feedback?: string;
  feedbackSource: string;
  chapterId?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const attempt = await prisma.assessmentAttempt.create({ data });
    return { success: true, data: { id: attempt.id } };
  } catch (error) {
    console.error("[storeAssessmentAttempt] Error:", error);
    return { success: false, error: "Failed to store assessment attempt" };
  }
}

/**
 * Get all assessment attempts for a lesson
 */
export async function getAssessmentAttempts(
  userId: string,
  lessonId: string
): Promise<ActionResult<Awaited<ReturnType<typeof prisma.assessmentAttempt.findMany>>>> {
  try {
    const attempts = await prisma.assessmentAttempt.findMany({
      where: { userId, lessonId },
      orderBy: { createdAt: "asc" },
    });
    return { success: true, data: attempts };
  } catch (error) {
    console.error("[getAssessmentAttempts] Error:", error);
    return { success: false, error: "Failed to get assessment attempts" };
  }
}

/**
 * Generate learning summary from assessment attempts
 */
export async function generateLearningSummary(
  userId: string,
  lessonId: string,
  quiz: LessonQuiz
): Promise<ActionResult<LearningSummary>> {
  try {
    const attemptsResult = await getAssessmentAttempts(userId, lessonId);

    // Handle error from getAssessmentAttempts
    if (!attemptsResult.success) {
      return { success: false, error: attemptsResult.error };
    }

    const attempts = attemptsResult.data;

    // Group attempts by chapter
    const byChapter = new Map<string, typeof attempts>();
    const noChapter: typeof attempts = [];

    for (const attempt of attempts) {
      if (attempt.chapterId) {
        const list = byChapter.get(attempt.chapterId) || [];
        list.push(attempt);
        byChapter.set(attempt.chapterId, list);
      } else {
        noChapter.push(attempt);
      }
    }

    // Calculate per-chapter scores
    const chaptersUnderstood: ChapterResult[] = [];
    const chaptersToReview: ChapterResult[] = [];

    for (const chapter of quiz.chapters) {
      const chapterAttempts = byChapter.get(chapter.id) || [];
      if (chapterAttempts.length === 0) continue;

      const answered = chapterAttempts.filter((a) => !a.isSkipped);
      const correct = answered.filter((a) => a.isCorrect).length;
      const correctRate = answered.length > 0 ? correct / answered.length : 0;

      const result: ChapterResult = {
        id: chapter.id,
        title: chapter.title,
        correctRate,
      };

      if (correctRate >= ASSESSMENT_CONFIG.CHAPTER_UNDERSTANDING_THRESHOLD) {
        chaptersUnderstood.push(result);
      } else {
        chaptersToReview.push({
          ...result,
          suggestedAids: [
            {
              type: "summary",
              title: `2-minute summary: ${chapter.title}`,
              duration: "2 min",
            },
            {
              type: "reel",
              title: `1-minute reel: ${chapter.title}`,
              duration: "1 min",
            },
          ],
        });
      }
    }

    // Calculate overall stats
    const answered = attempts.filter((a) => !a.isSkipped);
    const correct = answered.filter((a) => a.isCorrect).length;

    return {
      success: true,
      data: {
        chaptersUnderstood,
        chaptersToReview,
        overallScore: answered.length > 0 ? correct / answered.length : 0,
        totalQuestions: attempts.length,
        correctAnswers: correct,
        skippedQuestions: attempts.filter((a) => a.isSkipped).length,
      },
    };
  } catch (error) {
    console.error("[generateLearningSummary] Error:", error);
    return { success: false, error: "Failed to generate learning summary" };
  }
}
```

**Step 2: Commit**

```bash
git add actions/assessment.ts
git commit -m "feat(actions): add assessment server actions"
```

---

## Phase 2: Assessment Context & Components

### Task 4: Create Assessment Context Provider

**Files:**
- Create: `contexts/AssessmentContext.tsx`

**Step 1: Create the context file**

```typescript
// contexts/AssessmentContext.tsx
"use client";

import React, { createContext, useContext, useReducer, useCallback, useEffect } from "react";
import type {
  AssessmentSessionState,
  AssessmentPhase,
  QuizAnswer,
  LessonQuiz,
  LearningSummary,
  Chapter,
  InlessonQuestion,
} from "@/types/assessment";
import {
  getOrCreateAssessmentSession,
  updateAssessmentPhase,
  completeWarmup,
  completeConceptCheck,
  completeInlesson,
  completeFormative,
  storeAssessmentAttempt,
  generateLearningSummary,
} from "@/actions/assessment";

type AssessmentAction =
  | { type: "SET_PHASE"; phase: AssessmentPhase }
  | { type: "SET_QUIZ"; quiz: LessonQuiz }
  | { type: "WARMUP_ANSWER"; answer: QuizAnswer }
  | { type: "WARMUP_NEXT" }
  | { type: "WARMUP_COMPLETE"; skipped: boolean }
  | { type: "CONCEPT_CHECK_START"; chapterId: string }
  | { type: "CONCEPT_CHECK_ANSWER"; chapterId: string; answer: QuizAnswer }
  | { type: "CONCEPT_CHECK_SKIP"; chapterId: string }
  | { type: "CONCEPT_CHECK_COMPLETE"; chapterId: string; skipped: boolean }
  | { type: "INLESSON_START"; questionId: string }
  | { type: "INLESSON_ANSWER"; questionId: string; response: string; responseType: "voice" | "text"; isCorrect?: boolean; aiEvaluation?: string }
  | { type: "INLESSON_COMPLETE"; questionId: string; skipped: boolean }
  | { type: "FORMATIVE_ANSWER"; answer: QuizAnswer }
  | { type: "FORMATIVE_NEXT" }
  | { type: "FORMATIVE_COMPLETE"; skipped: boolean }
  | { type: "SET_SUMMARY"; summary: LearningSummary }
  | { type: "RESET" };

interface AssessmentContextValue {
  state: AssessmentSessionState;
  quiz: LessonQuiz | null;
  summary: LearningSummary | null;
  dispatch: React.Dispatch<AssessmentAction>;
  // Actions
  startWarmup: () => void;
  answerWarmup: (questionId: string, selectedOption: string, isCorrect: boolean) => void;
  skipWarmup: () => void;
  triggerConceptCheck: (chapter: Chapter) => void;
  answerConceptCheck: (chapterId: string, answer: QuizAnswer) => void;
  skipConceptCheck: (chapterId: string) => void;
  triggerInlesson: (question: InlessonQuestion) => void;
  answerInlesson: (questionId: string, response: string, responseType: "voice" | "text") => void;
  skipInlesson: (questionId: string) => void;
  startFormative: () => void;
  answerFormative: (questionId: string, selectedOption: string, isCorrect: boolean) => void;
  skipFormative: () => void;
  loadSummary: () => Promise<void>;
}

const initialState: AssessmentSessionState = {
  lessonId: "",
  odataUserId: "",
  phase: "idle",
  warmup: {
    currentIndex: 0,
    answers: [],
    completed: false,
    skipped: false,
  },
  conceptChecks: {},
  inlesson: {},
  formative: {
    currentIndex: 0,
    answers: [],
    completed: false,
    skipped: false,
  },
};

function assessmentReducer(
  state: AssessmentSessionState,
  action: AssessmentAction
): AssessmentSessionState {
  switch (action.type) {
    case "SET_PHASE":
      return { ...state, phase: action.phase };

    case "WARMUP_ANSWER":
      return {
        ...state,
        warmup: {
          ...state.warmup,
          answers: [...state.warmup.answers, action.answer],
        },
      };

    case "WARMUP_NEXT":
      return {
        ...state,
        warmup: {
          ...state.warmup,
          currentIndex: state.warmup.currentIndex + 1,
        },
      };

    case "WARMUP_COMPLETE":
      return {
        ...state,
        phase: "video",
        warmup: {
          ...state.warmup,
          completed: !action.skipped,
          skipped: action.skipped,
        },
      };

    case "CONCEPT_CHECK_START":
      return {
        ...state,
        phase: "concept_check",
        conceptChecks: {
          ...state.conceptChecks,
          [action.chapterId]: {
            answers: [],
            completed: false,
            skipped: false,
          },
        },
      };

    case "CONCEPT_CHECK_ANSWER":
      return {
        ...state,
        conceptChecks: {
          ...state.conceptChecks,
          [action.chapterId]: {
            ...state.conceptChecks[action.chapterId],
            answers: [
              ...(state.conceptChecks[action.chapterId]?.answers || []),
              action.answer,
            ],
          },
        },
      };

    case "CONCEPT_CHECK_SKIP":
      // Alias for CONCEPT_CHECK_COMPLETE with skipped=true
      return {
        ...state,
        phase: "video",
        conceptChecks: {
          ...state.conceptChecks,
          [action.chapterId]: {
            ...state.conceptChecks[action.chapterId],
            completed: false,
            skipped: true,
          },
        },
      };

    case "CONCEPT_CHECK_COMPLETE":
      return {
        ...state,
        phase: "video",
        conceptChecks: {
          ...state.conceptChecks,
          [action.chapterId]: {
            ...state.conceptChecks[action.chapterId],
            completed: !action.skipped,
            skipped: action.skipped,
          },
        },
      };

    case "INLESSON_START":
      return {
        ...state,
        phase: "inlesson",
        inlesson: {
          ...state.inlesson,
          [action.questionId]: {
            response: "",
            responseType: "text",
            completed: false,
            skipped: false,
          },
        },
      };

    case "INLESSON_ANSWER":
      return {
        ...state,
        inlesson: {
          ...state.inlesson,
          [action.questionId]: {
            ...state.inlesson[action.questionId],
            response: action.response,
            responseType: action.responseType,
            isCorrect: action.isCorrect,
            aiEvaluation: action.aiEvaluation,
          },
        },
      };

    case "INLESSON_COMPLETE":
      return {
        ...state,
        phase: "video",
        inlesson: {
          ...state.inlesson,
          [action.questionId]: {
            ...state.inlesson[action.questionId],
            completed: !action.skipped,
            skipped: action.skipped,
          },
        },
      };

    case "FORMATIVE_ANSWER":
      return {
        ...state,
        formative: {
          ...state.formative,
          answers: [...state.formative.answers, action.answer],
        },
      };

    case "FORMATIVE_NEXT":
      return {
        ...state,
        formative: {
          ...state.formative,
          currentIndex: state.formative.currentIndex + 1,
        },
      };

    case "FORMATIVE_COMPLETE":
      return {
        ...state,
        phase: "summary",
        formative: {
          ...state.formative,
          completed: !action.skipped,
          skipped: action.skipped,
        },
      };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

const AssessmentContext = createContext<AssessmentContextValue | null>(null);

interface AssessmentProviderProps {
  children: React.ReactNode;
  lessonId: string;
  userId: string;
  quiz: LessonQuiz | null;
}

export function AssessmentProvider({
  children,
  lessonId,
  userId,
  quiz,
}: AssessmentProviderProps) {
  const [state, dispatch] = useReducer(assessmentReducer, {
    ...initialState,
    lessonId,
    odataUserId: userId,
  });
  const [summary, setSummary] = React.useState<LearningSummary | null>(null);

  // Refs to avoid stale closures in callbacks
  const quizRef = React.useRef(quiz);
  const stateRef = React.useRef(state);

  // Keep refs updated
  React.useEffect(() => {
    quizRef.current = quiz;
  }, [quiz]);

  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Initialize session on mount
  useEffect(() => {
    getOrCreateAssessmentSession(userId, lessonId);
  }, [userId, lessonId]);

  const startWarmup = useCallback(() => {
    dispatch({ type: "SET_PHASE", phase: "warmup" });
    updateAssessmentPhase(userId, lessonId, "warmup");
  }, [userId, lessonId]);

  const answerWarmup = useCallback(
    async (questionId: string, selectedOption: string, isCorrect: boolean) => {
      // Use refs to get current values and avoid stale closures
      const currentQuiz = quizRef.current;
      const currentState = stateRef.current;

      const question = currentQuiz?.warmup.find((q) => q.id === questionId);
      if (!question) return;

      const answer: QuizAnswer = {
        questionId,
        selectedOption,
        isCorrect,
        chapter_id: question.chapter_id,
        timestamp: new Date(),
      };

      dispatch({ type: "WARMUP_ANSWER", answer });

      await storeAssessmentAttempt({
        userId,
        lessonId,
        assessmentType: "warmup",
        questionId,
        questionText: question.question,
        userAnswer: selectedOption,
        correctAnswer: question.correct_option,
        isCorrect,
        feedback: question.feedback,
        feedbackSource: "db",
        chapterId: question.chapter_id,
      });

      // Move to next question or complete - use current state from ref
      if (currentState.warmup.currentIndex + 1 < (currentQuiz?.warmup.length || 0)) {
        dispatch({ type: "WARMUP_NEXT" });
      } else {
        dispatch({ type: "WARMUP_COMPLETE", skipped: false });
        await completeWarmup(userId, lessonId, false);
      }
    },
    [userId, lessonId] // Removed quiz and state from deps since we use refs
  );

  const skipWarmup = useCallback(async () => {
    dispatch({ type: "WARMUP_COMPLETE", skipped: true });
    await completeWarmup(userId, lessonId, true);
  }, [userId, lessonId]);

  const triggerConceptCheck = useCallback(
    (chapter: Chapter) => {
      dispatch({ type: "CONCEPT_CHECK_START", chapterId: chapter.id });
      updateAssessmentPhase(userId, lessonId, "concept_check");
    },
    [userId, lessonId]
  );

  const answerConceptCheck = useCallback(
    async (chapterId: string, answer: QuizAnswer) => {
      dispatch({ type: "CONCEPT_CHECK_ANSWER", chapterId, answer });

      await storeAssessmentAttempt({
        userId,
        lessonId,
        assessmentType: "concept_check",
        questionId: answer.questionId,
        questionText: "", // Sarvam-generated, not stored
        userAnswer: answer.selectedOption,
        isCorrect: answer.isCorrect,
        feedbackSource: "sarvam_qna",
        chapterId,
      });
    },
    [userId, lessonId]
  );

  const skipConceptCheck = useCallback(
    async (chapterId: string) => {
      dispatch({ type: "CONCEPT_CHECK_COMPLETE", chapterId, skipped: true });
      await completeConceptCheck(userId, lessonId, chapterId, true);
    },
    [userId, lessonId]
  );

  const triggerInlesson = useCallback(
    (question: InlessonQuestion) => {
      dispatch({ type: "INLESSON_START", questionId: question.id });
      updateAssessmentPhase(userId, lessonId, "inlesson");
    },
    [userId, lessonId]
  );

  const answerInlesson = useCallback(
    async (questionId: string, response: string, responseType: "voice" | "text") => {
      const question = quiz?.inlesson.find((q) => q.id === questionId);
      if (!question) return;

      dispatch({
        type: "INLESSON_ANSWER",
        questionId,
        response,
        responseType,
      });

      await storeAssessmentAttempt({
        userId,
        lessonId,
        assessmentType: "inlesson",
        questionId,
        questionText: question.question,
        userAnswer: response,
        correctAnswer: question.correct_option,
        feedbackSource: "sarvam_qna",
        chapterId: question.chapter_id,
      });
    },
    [quiz, userId, lessonId]
  );

  const skipInlesson = useCallback(
    async (questionId: string) => {
      const question = quiz?.inlesson.find((q) => q.id === questionId);

      dispatch({ type: "INLESSON_COMPLETE", questionId, skipped: true });
      await completeInlesson(userId, lessonId, questionId);

      if (question) {
        await storeAssessmentAttempt({
          userId,
          lessonId,
          assessmentType: "inlesson",
          questionId,
          questionText: question.question,
          userAnswer: "",
          isSkipped: true,
          feedbackSource: "sarvam_qna",
          chapterId: question.chapter_id,
        });
      }
    },
    [quiz, userId, lessonId]
  );

  const startFormative = useCallback(() => {
    dispatch({ type: "SET_PHASE", phase: "formative" });
    updateAssessmentPhase(userId, lessonId, "formative");
  }, [userId, lessonId]);

  const answerFormative = useCallback(
    async (questionId: string, selectedOption: string, isCorrect: boolean) => {
      const answer: QuizAnswer = {
        questionId,
        selectedOption,
        isCorrect,
        timestamp: new Date(),
      };

      dispatch({ type: "FORMATIVE_ANSWER", answer });

      await storeAssessmentAttempt({
        userId,
        lessonId,
        assessmentType: "formative",
        questionId,
        questionText: "", // Sarvam-generated
        userAnswer: selectedOption,
        isCorrect,
        feedbackSource: "sarvam_fa",
      });

      dispatch({ type: "FORMATIVE_NEXT" });
    },
    [userId, lessonId]
  );

  const skipFormative = useCallback(async () => {
    dispatch({ type: "FORMATIVE_COMPLETE", skipped: true });
    await completeFormative(userId, lessonId, true);
  }, [userId, lessonId]);

  const loadSummary = useCallback(async () => {
    if (!quiz) return;
    const result = await generateLearningSummary(userId, lessonId, quiz);
    if (result.success) {
      setSummary(result.data);
    } else {
      console.error("[loadSummary] Failed:", result.error);
      // Set empty summary on error
      setSummary({
        chaptersUnderstood: [],
        chaptersToReview: [],
        overallScore: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        skippedQuestions: 0,
      });
    }
  }, [userId, lessonId, quiz]);

  // Memoize context value to prevent unnecessary re-renders of consumers
  const value = React.useMemo<AssessmentContextValue>(
    () => ({
      state,
      quiz,
      summary,
      dispatch,
      startWarmup,
      answerWarmup,
      skipWarmup,
      triggerConceptCheck,
      answerConceptCheck,
      skipConceptCheck,
      triggerInlesson,
      answerInlesson,
      skipInlesson,
      startFormative,
      answerFormative,
      skipFormative,
      loadSummary,
    }),
    [
      state,
      quiz,
      summary,
      startWarmup,
      answerWarmup,
      skipWarmup,
      triggerConceptCheck,
      answerConceptCheck,
      skipConceptCheck,
      triggerInlesson,
      answerInlesson,
      skipInlesson,
      startFormative,
      answerFormative,
      skipFormative,
      loadSummary,
    ]
  );

  return (
    <AssessmentContext.Provider value={value}>
      {children}
    </AssessmentContext.Provider>
  );
}

export function useAssessment() {
  const context = useContext(AssessmentContext);
  if (!context) {
    throw new Error("useAssessment must be used within AssessmentProvider");
  }
  return context;
}
```

**Step 2: Commit**

```bash
git add contexts/AssessmentContext.tsx
git commit -m "feat(context): add AssessmentProvider for session state management"
```

---

### Task 5: Create QuizQuestion Component

**Files:**
- Create: `components/assessment/QuizQuestion.tsx`

**Step 1: Create the component**

```typescript
// components/assessment/QuizQuestion.tsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, Circle } from "lucide-react";
import type { QuizQuestion as QuizQuestionType, QuizOption } from "@/types/assessment";

interface QuizQuestionProps {
  question: QuizQuestionType;
  onAnswer: (selectedOption: string) => void;
  onSkip?: () => void;
  disabled?: boolean;
  showSkip?: boolean;
}

export function QuizQuestion({
  question,
  onAnswer,
  onSkip,
  disabled = false,
  showSkip = true,
}: QuizQuestionProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleOptionClick = (optionId: string) => {
    if (disabled) return;
    setSelectedOption(optionId);
  };

  const handleSubmit = () => {
    if (selectedOption) {
      onAnswer(selectedOption);
    }
  };

  return (
    <div className="space-y-4">
      {/* Question text */}
      <p className="text-base font-medium text-gray-900">{question.question}</p>

      {/* Options */}
      <div className="space-y-2">
        {question.options.map((option: QuizOption) => (
          <button
            key={option.id}
            onClick={() => handleOptionClick(option.id)}
            disabled={disabled}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
              selectedOption === option.id
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {selectedOption === option.id ? (
              <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-gray-300 flex-shrink-0" />
            )}
            <span className="text-sm">
              <span className="font-medium">{option.id}.</span> {option.text}
            </span>
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSubmit}
          disabled={!selectedOption || disabled}
          className={cn(
            "flex-1 px-4 py-2 rounded-lg font-medium transition-colors",
            selectedOption && !disabled
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          )}
        >
          Submit
        </button>
        {showSkip && onSkip && (
          <button
            onClick={onSkip}
            disabled={disabled}
            className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/assessment/QuizQuestion.tsx
git commit -m "feat(components): add QuizQuestion component for MCQ display"
```

---

### Task 6: Create QuizFeedback Component

**Files:**
- Create: `components/assessment/QuizFeedback.tsx`

**Step 1: Create the component**

```typescript
// components/assessment/QuizFeedback.tsx
"use client";

import { cn } from "@/lib/utils";
import { CheckCircle, XCircle } from "lucide-react";

interface QuizFeedbackProps {
  isCorrect: boolean;
  feedback: string;
  onContinue: () => void;
}

export function QuizFeedback({ isCorrect, feedback, onContinue }: QuizFeedbackProps) {
  return (
    <div className="space-y-4">
      {/* Result indicator */}
      <div
        className={cn(
          "flex items-center gap-2 p-3 rounded-lg",
          isCorrect ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
        )}
      >
        {isCorrect ? (
          <CheckCircle className="h-5 w-5" />
        ) : (
          <XCircle className="h-5 w-5" />
        )}
        <span className="font-medium">
          {isCorrect ? "Correct!" : "Not quite right"}
        </span>
      </div>

      {/* Feedback text */}
      <p className="text-sm text-gray-700 leading-relaxed">{feedback}</p>

      {/* Continue button */}
      <button
        onClick={onContinue}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
      >
        Continue
      </button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/assessment/QuizFeedback.tsx
git commit -m "feat(components): add QuizFeedback component for answer feedback"
```

---

### Task 7: Create WarmupQuiz Component

**Files:**
- Create: `components/assessment/WarmupQuiz.tsx`

**Step 1: Create the component**

```typescript
// components/assessment/WarmupQuiz.tsx
"use client";

import { useState } from "react";
import { useAssessment } from "@/contexts/AssessmentContext";
import { QuizQuestion } from "./QuizQuestion";
import { QuizFeedback } from "./QuizFeedback";
import { useTTS } from "@/hooks/useTTS";

interface WarmupQuizProps {
  onComplete: () => void;
}

export function WarmupQuiz({ onComplete }: WarmupQuizProps) {
  const { state, quiz, answerWarmup, skipWarmup } = useAssessment();
  const { speak } = useTTS();
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<{
    isCorrect: boolean;
    feedback: string;
  } | null>(null);

  if (!quiz || quiz.warmup.length === 0) {
    return null;
  }

  const currentQuestion = quiz.warmup[state.warmup.currentIndex];
  const isLastQuestion = state.warmup.currentIndex === quiz.warmup.length - 1;

  const handleAnswer = (selectedOption: string) => {
    const isCorrect = selectedOption === currentQuestion.correct_option;

    setLastAnswer({
      isCorrect,
      feedback: currentQuestion.feedback,
    });
    setShowFeedback(true);

    // Speak feedback
    speak(currentQuestion.feedback);

    // Store the answer
    answerWarmup(currentQuestion.id, selectedOption, isCorrect);
  };

  const handleContinue = () => {
    setShowFeedback(false);
    setLastAnswer(null);

    if (isLastQuestion) {
      onComplete();
    }
  };

  const handleSkip = () => {
    skipWarmup();
    onComplete();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Warm-up Quiz</h3>
        <span className="text-sm text-gray-500">
          Question {state.warmup.currentIndex + 1} of {quiz.warmup.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{
            width: `${((state.warmup.currentIndex + (showFeedback ? 1 : 0)) / quiz.warmup.length) * 100}%`,
          }}
        />
      </div>

      {/* Question or Feedback */}
      {showFeedback && lastAnswer ? (
        <QuizFeedback
          isCorrect={lastAnswer.isCorrect}
          feedback={lastAnswer.feedback}
          onContinue={handleContinue}
        />
      ) : (
        <QuizQuestion
          question={currentQuestion}
          onAnswer={handleAnswer}
          onSkip={handleSkip}
          showSkip={state.warmup.currentIndex === 0} // Only show skip on first question
        />
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/assessment/WarmupQuiz.tsx
git commit -m "feat(components): add WarmupQuiz component for pre-lesson warmup"
```

---

### Task 8: Create InLessonQuestion Component

**Files:**
- Create: `components/assessment/InLessonQuestion.tsx`

**Step 1: Create the component**

```typescript
// components/assessment/InLessonQuestion.tsx
"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Mic, MicOff, Send, CheckCircle, XCircle } from "lucide-react";
import { useAssessment } from "@/contexts/AssessmentContext";
import { QuizQuestion } from "./QuizQuestion";
import { parseSarvamFeedback } from "@/actions/assessment";
import type { InlessonQuestion as InlessonQuestionType } from "@/types/assessment";

interface InLessonQuestionProps {
  question: InlessonQuestionType;
  onComplete: () => void;
  onSendToAgent: (message: string) => void;
  agentResponse?: string; // Sarvam response received via data channel
}

export function InLessonQuestion({
  question,
  onComplete,
  onSendToAgent,
  agentResponse,
}: InLessonQuestionProps) {
  const { answerInlesson, skipInlesson } = useAssessment();
  const [textInput, setTextInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean | null;
    text: string;
  } | null>(null);

  // Process Sarvam response when received
  useEffect(() => {
    if (agentResponse && isSubmitting) {
      // Use existing detectAnswerFeedback via parseSarvamFeedback
      const parsed = parseSarvamFeedback(agentResponse);
      setFeedback({
        isCorrect: parsed.isCorrect,
        text: parsed.feedback,
      });
      setIsSubmitting(false);
    }
  }, [agentResponse, isSubmitting]);

  const handleMCQAnswer = (selectedOption: string) => {
    setIsSubmitting(true);
    answerInlesson(question.id, selectedOption, "text");

    // Send to agent for evaluation
    onSendToAgent(
      `ASSESSMENT:${JSON.stringify({
        type: "INLESSON_ANSWER",
        data: {
          questionId: question.id,
          answer: selectedOption,
          questionType: "mcq",
          correctOption: question.correct_option,
        },
      })}`
    );
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) return;

    setIsSubmitting(true);
    answerInlesson(question.id, textInput, "text");

    // Send to agent for evaluation
    onSendToAgent(
      `ASSESSMENT:${JSON.stringify({
        type: "INLESSON_ANSWER",
        data: {
          questionId: question.id,
          answer: textInput,
          questionType: "text",
        },
      })}`
    );
  };

  const handleSkip = () => {
    skipInlesson(question.id);
    onSendToAgent(
      `ASSESSMENT:${JSON.stringify({
        type: "INLESSON_SKIP",
        data: { questionId: question.id },
      })}`
    );
    onComplete();
  };

  /**
   * Voice recording integration:
   * This uses the existing LiveKit audio track from useLiveKit hook.
   * When recording starts, the user speaks and their voice is captured
   * by the LiveKit room's local audio track. The agent receives the audio
   * stream and can transcribe it using Sarvam STT.
   *
   * Implementation options:
   * 1. Use existing useLiveKit().startMicrophone() / stopMicrophone()
   * 2. Use the agent's STT transcription (agent sends back transcribed text)
   * 3. Use browser's Web Speech API for client-side transcription
   *
   * For now, this component supports text input primarily.
   * Voice input flows through the LiveKit agent which transcribes and responds.
   */
  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      // The agent will process the audio and send back the transcription
      // via agentResponse prop, which triggers the useEffect above
    } else {
      // Start recording
      setIsRecording(true);
      // Notify agent that user is speaking for in-lesson question
      onSendToAgent(
        JSON.stringify({
          type: "INLESSON_VOICE_START",
          payload: { questionId: question.id },
        })
      );
    }
  };

  // Show feedback if received from Sarvam
  if (feedback) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
          <span>Professor asks:</span>
        </div>
        <p className="text-base font-medium text-gray-900">{question.question}</p>

        {/* Feedback from Sarvam */}
        <div
          className={cn(
            "flex items-center gap-2 p-3 rounded-lg",
            feedback.isCorrect === true
              ? "bg-green-50 text-green-700"
              : feedback.isCorrect === false
              ? "bg-amber-50 text-amber-700"
              : "bg-blue-50 text-blue-700"
          )}
        >
          {feedback.isCorrect === true ? (
            <CheckCircle className="h-5 w-5" />
          ) : feedback.isCorrect === false ? (
            <XCircle className="h-5 w-5" />
          ) : null}
          <span className="font-medium">
            {feedback.isCorrect === true
              ? "Correct!"
              : feedback.isCorrect === false
              ? "Not quite right"
              : "Feedback"}
          </span>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">{feedback.text}</p>

        <button
          onClick={onComplete}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Continue
        </button>
      </div>
    );
  }

  // MCQ type question
  if (question.type === "mcq" && question.options) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
          <span>Professor asks:</span>
        </div>
        <QuizQuestion
          question={{
            id: question.id,
            question: question.question,
            options: question.options,
            correct_option: question.correct_option || "",
            feedback: "",
          }}
          onAnswer={handleMCQAnswer}
          onSkip={handleSkip}
          disabled={isSubmitting}
        />
      </div>
    );
  }

  // Text type question
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
        <span>Professor asks:</span>
      </div>

      <p className="text-base font-medium text-gray-900">{question.question}</p>

      {/* Text input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type your answer..."
            disabled={isSubmitting}
            className={cn(
              "w-full p-3 pr-10 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
              isSubmitting && "opacity-50 cursor-not-allowed"
            )}
            rows={3}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={toggleRecording}
          disabled={isSubmitting}
          className={cn(
            "p-3 rounded-lg transition-colors",
            isRecording
              ? "bg-red-100 text-red-600"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          {isRecording ? (
            <MicOff className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </button>

        <button
          onClick={handleTextSubmit}
          disabled={!textInput.trim() || isSubmitting}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
            textInput.trim() && !isSubmitting
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          )}
        >
          <Send className="h-4 w-4" />
          Submit
        </button>

        <button
          onClick={handleSkip}
          disabled={isSubmitting}
          className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/assessment/InLessonQuestion.tsx
git commit -m "feat(components): add InLessonQuestion component for professor questions"
```

---

### Task 9: Create LearningSummary Component

**Files:**
- Create: `components/assessment/LearningSummary.tsx`

**Step 1: Create the component**

```typescript
// components/assessment/LearningSummary.tsx
"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, FileText, Play } from "lucide-react";
import { useAssessment } from "@/contexts/AssessmentContext";
import { useTTS } from "@/hooks/useTTS";

interface LearningSummaryProps {
  onReviewNow: () => void;
  onContinue: () => void;
}

export function LearningSummary({ onReviewNow, onContinue }: LearningSummaryProps) {
  const { summary, loadSummary } = useAssessment();
  const { speak } = useTTS();

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (summary) {
      // Speak the summary
      let speech = "Here's your learning summary. ";

      if (summary.chaptersUnderstood.length > 0) {
        const chapters = summary.chaptersUnderstood.map((c) => c.title).join(", ");
        speech += `You understood these chapters well: ${chapters}. `;
      }

      if (summary.chaptersToReview.length > 0) {
        const chapters = summary.chaptersToReview.map((c) => c.title).join(", ");
        speech += `I recommend revisiting: ${chapters}. `;
      }

      speech += `Overall, you got ${summary.correctAnswers} out of ${summary.totalQuestions} correct. `;

      if (summary.overallScore >= 0.8) {
        speech += "Great job!";
      } else if (summary.overallScore >= 0.6) {
        speech += "Good progress!";
      } else {
        speech += "Let's review before moving on.";
      }

      speak(speech);
    }
  }, [summary, speak]);

  if (!summary) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const scorePercent = Math.round(summary.overallScore * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-4 rounded-lg">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span>Your Learning Summary</span>
        </h2>
      </div>

      {/* Chapters Understood */}
      {summary.chaptersUnderstood.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            What You Understood Well
          </h3>
          <div className="bg-green-50 rounded-lg p-4 space-y-2">
            {summary.chaptersUnderstood.map((chapter) => (
              <div
                key={chapter.id}
                className="flex items-center justify-between text-green-700"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {chapter.title}
                </span>
                <span className="text-sm">
                  {Math.round(chapter.correctRate * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chapters to Review */}
      {summary.chaptersToReview.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Let&apos;s Revisit These
          </h3>
          <div className="bg-amber-50 rounded-lg p-4 space-y-4">
            {summary.chaptersToReview.map((chapter) => (
              <div key={chapter.id} className="space-y-2">
                <div className="flex items-center justify-between text-amber-700">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {chapter.title}
                  </span>
                  <span className="text-sm">
                    {Math.round(chapter.correctRate * 100)}%
                  </span>
                </div>
                {chapter.suggestedAids && (
                  <div className="flex gap-2 pl-6">
                    {chapter.suggestedAids.map((aid, idx) => (
                      <button
                        key={idx}
                        className="flex items-center gap-1 text-xs bg-white px-2 py-1 rounded border border-amber-200 text-amber-600 hover:bg-amber-100"
                      >
                        {aid.type === "summary" ? (
                          <FileText className="h-3 w-3" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                        {aid.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overall Score */}
      <div className="text-center py-4 border-t border-gray-200">
        <p className="text-gray-600">
          Overall: <span className="font-bold text-gray-900">{summary.correctAnswers}/{summary.totalQuestions}</span> correct ({scorePercent}%)
        </p>
        {summary.skippedQuestions > 0 && (
          <p className="text-sm text-gray-500">
            {summary.skippedQuestions} question(s) skipped
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {summary.chaptersToReview.length > 0 && (
          <button
            onClick={onReviewNow}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Review Now (Recommended)
          </button>
        )}
        <button
          onClick={onContinue}
          className={cn(
            "px-4 py-3 rounded-lg font-medium transition-colors",
            summary.chaptersToReview.length > 0
              ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
              : "flex-1 bg-green-600 text-white hover:bg-green-700"
          )}
        >
          Continue to Next Lesson
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/assessment/LearningSummary.tsx
git commit -m "feat(components): add LearningSummary component for feedback display"
```

---

### Task 9.1: Create ConceptCheck Component

**Files:**
- Create: `components/assessment/ConceptCheck.tsx`

**Step 1: Create the component**

```typescript
// components/assessment/ConceptCheck.tsx
"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { BookOpen, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useAssessment } from "@/contexts/AssessmentContext";
import { parseSarvamFeedback } from "@/actions/assessment";
import { useTTS } from "@/hooks/useTTS";
import type { Chapter } from "@/types/assessment";

interface ConceptCheckProps {
  chapter: Chapter;
  onComplete: () => void;
  onSendToAgent: (message: string) => void;
  agentResponse?: string | null;
}

export function ConceptCheck({
  chapter,
  onComplete,
  onSendToAgent,
  agentResponse,
}: ConceptCheckProps) {
  const { answerConceptCheck, skipConceptCheck } = useAssessment();
  const { speak } = useTTS();
  const [isLoading, setIsLoading] = useState(true);
  const [question, setQuestion] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean | null;
    text: string;
  } | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const MAX_QUESTIONS = 2; // Concept check has 2 questions

  // Request first question on mount
  useEffect(() => {
    // Agent should already have received CONCEPT_CHECK message
    // Wait for agentResponse with first question
  }, []);

  // Process agent response
  useEffect(() => {
    if (!agentResponse) return;

    setIsLoading(false);

    // Check if this is a question or feedback
    const hasFeedback = parseSarvamFeedback(agentResponse);

    if (hasFeedback.isCorrect !== null && question) {
      // This is feedback for previous answer
      setFeedback({
        isCorrect: hasFeedback.isCorrect,
        text: agentResponse,
      });
      speak(agentResponse);

      // Record the answer
      answerConceptCheck(chapter.id, {
        questionId: `cc-${chapter.id}-${questionCount}`,
        selectedOption: userAnswer,
        isCorrect: hasFeedback.isCorrect,
        chapter_id: chapter.id,
        timestamp: new Date(),
      });

      // Check if we should show next question or complete
      if (questionCount >= MAX_QUESTIONS) {
        // All questions done
        setTimeout(() => {
          onComplete();
        }, 2000);
      }
    } else {
      // This is a new question
      setQuestion(agentResponse);
      setFeedback(null);
      setUserAnswer("");
      setQuestionCount((prev) => prev + 1);
      speak(agentResponse);
    }
  }, [agentResponse, question, questionCount, chapter.id, userAnswer, speak, answerConceptCheck, onComplete]);

  const handleSubmit = () => {
    if (!userAnswer.trim()) return;

    setIsLoading(true);

    // Send answer to agent for evaluation
    onSendToAgent(
      `ASSESSMENT:${JSON.stringify({
        type: "CONCEPT_CHECK_ANSWER",
        data: {
          chapterId: chapter.id,
          answer: userAnswer,
          questionNumber: questionCount,
        },
      })}`
    );
  };

  const handleSkip = () => {
    skipConceptCheck(chapter.id);
    onComplete();
  };

  const handleContinue = () => {
    setFeedback(null);
    setIsLoading(true);

    // Request next question if not done
    if (questionCount < MAX_QUESTIONS) {
      onSendToAgent(
        `ASSESSMENT:${JSON.stringify({
          type: "CONCEPT_CHECK",
          data: { chapter, requestNext: true },
        })}`
      );
    } else {
      onComplete();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Concept Check: {chapter.title}
          </h3>
        </div>
        <span className="text-sm text-gray-500">
          {questionCount}/{MAX_QUESTIONS}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-purple-500 transition-all duration-300"
          style={{ width: `${(questionCount / MAX_QUESTIONS) * 100}%` }}
        />
      </div>

      {/* Loading state */}
      {isLoading && !question && (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <p className="text-sm text-gray-500">Generating concept check questions...</p>
        </div>
      )}

      {/* Show feedback */}
      {feedback && (
        <div className="space-y-4">
          <div
            className={cn(
              "flex items-center gap-2 p-3 rounded-lg",
              feedback.isCorrect === true
                ? "bg-green-50 text-green-700"
                : feedback.isCorrect === false
                ? "bg-amber-50 text-amber-700"
                : "bg-blue-50 text-blue-700"
            )}
          >
            {feedback.isCorrect === true ? (
              <CheckCircle className="h-5 w-5" />
            ) : feedback.isCorrect === false ? (
              <XCircle className="h-5 w-5" />
            ) : null}
            <span className="font-medium">
              {feedback.isCorrect ? "Correct!" : "Not quite right"}
            </span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{feedback.text}</p>

          <button
            onClick={handleContinue}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            {questionCount >= MAX_QUESTIONS ? "Complete" : "Next Question"}
          </button>
        </div>
      )}

      {/* Question and answer */}
      {question && !feedback && (
        <div className="space-y-4">
          <p className="text-base font-medium text-gray-900">{question}</p>

          <textarea
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="Type your answer..."
            disabled={isLoading}
            className={cn(
              "w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
            rows={3}
          />

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={!userAnswer.trim() || isLoading}
              className={cn(
                "flex-1 px-4 py-2 rounded-lg font-medium transition-colors",
                userAnswer.trim() && !isLoading
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Evaluating...
                </span>
              ) : (
                "Submit"
              )}
            </button>
            <button
              onClick={handleSkip}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/assessment/ConceptCheck.tsx
git commit -m "feat(components): add ConceptCheck component for chapter-end verification"
```

---

### Task 9.2: Create FormativeAssessment Component

**Files:**
- Create: `components/assessment/FormativeAssessment.tsx`

**Step 1: Create the component**

```typescript
// components/assessment/FormativeAssessment.tsx
"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ClipboardCheck, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useAssessment } from "@/contexts/AssessmentContext";
import { parseSarvamFeedback, parseAssessmentContent } from "@/lib/chat/assessment";
import { useTTS } from "@/hooks/useTTS";

interface FormativeAssessmentProps {
  onComplete: () => void;
  onSendToAgent: (message: string) => void;
  agentResponse?: string | null;
}

interface ParsedQuestion {
  questionNumber: number;
  questionText: string;
  options?: string[];
  isMultipleChoice: boolean;
}

export function FormativeAssessment({
  onComplete,
  onSendToAgent,
  agentResponse,
}: FormativeAssessmentProps) {
  const { answerFormative, skipFormative } = useAssessment();
  const { speak } = useTTS();
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState<ParsedQuestion | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean | null;
    text: string;
  } | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Process agent response
  useEffect(() => {
    if (!agentResponse) return;

    setIsLoading(false);

    // Check if this is completion
    if (
      agentResponse.toLowerCase().includes("completed") ||
      agentResponse.toLowerCase().includes("you scored") ||
      agentResponse.toLowerCase().includes("all questions")
    ) {
      setIsComplete(true);
      speak(agentResponse);
      return;
    }

    // Check if this is feedback or new question
    const feedbackResult = parseSarvamFeedback(agentResponse);
    const parsed = parseAssessmentContent(agentResponse);

    if (feedbackResult.isCorrect !== null && currentQuestion) {
      // This is feedback for previous answer
      setFeedback({
        isCorrect: feedbackResult.isCorrect,
        text: agentResponse,
      });
      speak(agentResponse);

      // Record the answer
      answerFormative(
        `fa-${questionCount}`,
        selectedOption || userAnswer,
        feedbackResult.isCorrect
      );

      // Check if there's a next question in the response
      if (parsed.questions.length > 0) {
        const nextQ = parsed.questions[0];
        setTimeout(() => {
          setCurrentQuestion(nextQ);
          setFeedback(null);
          setUserAnswer("");
          setSelectedOption(null);
          setQuestionCount((prev) => prev + 1);
          speak(nextQ.questionText);
        }, 2000);
      }
    } else if (parsed.questions.length > 0) {
      // This is a new question
      const q = parsed.questions[0];
      setCurrentQuestion(q);
      setFeedback(null);
      setUserAnswer("");
      setSelectedOption(null);
      setQuestionCount((prev) => prev + 1);
      speak(q.questionText);
    }
  }, [agentResponse, currentQuestion, questionCount, selectedOption, userAnswer, speak, answerFormative]);

  const handleSubmit = () => {
    const answer = currentQuestion?.isMultipleChoice ? selectedOption : userAnswer;
    if (!answer?.trim()) return;

    setIsLoading(true);

    // Send answer to Sarvam FA
    onSendToAgent(
      `ASSESSMENT:${JSON.stringify({
        type: "FORMATIVE_ANSWER",
        data: { answer },
      })}`
    );
  };

  const handleSkip = () => {
    skipFormative();
    onComplete();
  };

  const handleComplete = () => {
    onComplete();
  };

  // Completion screen
  if (isComplete) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-6 w-6" />
          <h3 className="text-lg font-semibold">Assessment Complete!</h3>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">{agentResponse}</p>
        <button
          onClick={handleComplete}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          View Learning Summary
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Quick Check</h3>
        </div>
        {questionCount > 0 && (
          <span className="text-sm text-gray-500">Question {questionCount}</span>
        )}
      </div>

      {/* Loading state */}
      {isLoading && !currentQuestion && (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-500">Generating assessment questions...</p>
        </div>
      )}

      {/* Show feedback */}
      {feedback && (
        <div className="space-y-4">
          <div
            className={cn(
              "flex items-center gap-2 p-3 rounded-lg",
              feedback.isCorrect === true
                ? "bg-green-50 text-green-700"
                : feedback.isCorrect === false
                ? "bg-amber-50 text-amber-700"
                : "bg-blue-50 text-blue-700"
            )}
          >
            {feedback.isCorrect === true ? (
              <CheckCircle className="h-5 w-5" />
            ) : feedback.isCorrect === false ? (
              <XCircle className="h-5 w-5" />
            ) : null}
            <span className="font-medium">
              {feedback.isCorrect ? "Correct!" : "Not quite right"}
            </span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{feedback.text}</p>
        </div>
      )}

      {/* Question */}
      {currentQuestion && !feedback && (
        <div className="space-y-4">
          <p className="text-base font-medium text-gray-900">
            {currentQuestion.questionText}
          </p>

          {/* MCQ Options */}
          {currentQuestion.isMultipleChoice && currentQuestion.options && (
            <div className="space-y-2">
              {currentQuestion.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedOption(option)}
                  disabled={isLoading}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                    selectedOption === option
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                    isLoading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span className="text-sm">{option}</span>
                </button>
              ))}
            </div>
          )}

          {/* Text input for non-MCQ */}
          {!currentQuestion.isMultipleChoice && (
            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Type your answer..."
              disabled={isLoading}
              className={cn(
                "w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
              rows={3}
            />
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={
                isLoading ||
                (currentQuestion.isMultipleChoice ? !selectedOption : !userAnswer.trim())
              }
              className={cn(
                "flex-1 px-4 py-2 rounded-lg font-medium transition-colors",
                (currentQuestion.isMultipleChoice ? selectedOption : userAnswer.trim()) &&
                  !isLoading
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Evaluating...
                </span>
              ) : (
                "Submit"
              )}
            </button>
            <button
              onClick={handleSkip}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Skip Assessment
            </button>
          </div>
        </div>
      )}

      {/* Waiting for next question */}
      {!currentQuestion && !isLoading && feedback && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600 mr-2" />
          <span className="text-sm text-gray-500">Loading next question...</span>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/assessment/FormativeAssessment.tsx
git commit -m "feat(components): add FormativeAssessment component for end-of-lesson quiz"
```

---

### Task 10: Create Assessment Components Index

**Files:**
- Create: `components/assessment/index.ts`

**Step 1: Create the index file**

```typescript
// components/assessment/index.ts
export { QuizQuestion } from "./QuizQuestion";
export { QuizFeedback } from "./QuizFeedback";
export { WarmupQuiz } from "./WarmupQuiz";
export { ConceptCheck } from "./ConceptCheck";
export { InLessonQuestion } from "./InLessonQuestion";
export { FormativeAssessment } from "./FormativeAssessment";
export { LearningSummary } from "./LearningSummary";
```

**Step 2: Commit**

```bash
git add components/assessment/index.ts
git commit -m "feat(components): add assessment components index"
```

---

## Phase 3: Video Player Integration

### Task 11: Update useKPointPlayer Hook for Assessment Triggers

**Files:**
- Modify: `hooks/useKPointPlayer.ts`

**Step 1: Add assessment trigger support**

Add new props to `UseKPointPlayerOptions` interface after line 50:

```typescript
// Add these props after onVideoEnd
onConceptCheck?: (chapter: Chapter) => void;
onInlesson?: (question: InlessonQuestion) => void;
quiz?: LessonQuiz | null;
```

Add imports at the top:

```typescript
import type { Chapter, InlessonQuestion, LessonQuiz } from "@/types/assessment";
```

**Reference: Types being imported (from Task 1: `types/assessment.ts`)**

```typescript
// Chapter type - represents a content section in the lesson
interface Chapter {
  id: string;
  title: string;
  start_timestamp: number;      // in seconds
  end_timestamp: number;        // in seconds
  description?: string;
  concept_check_enabled: boolean;
}

// InlessonQuestion type - professor's question during video
interface InlessonQuestion {
  id: string;
  question: string;
  timestamp: number;            // in seconds
  type: "text" | "voice";
  chapter_id?: string;
}

// LessonQuiz type - full quiz data for a lesson
interface LessonQuiz {
  chapters: Chapter[];
  warmup: QuizQuestion[];
  inlesson: InlessonQuestion[];
}
```

Add new refs after `triggeredBookmarksRef` (around line 64):

```typescript
const triggeredChaptersRef = useRef<Set<string>>(new Set());
const triggeredInlessonRef = useRef<Set<string>>(new Set());
const onConceptCheckRef = useRef(onConceptCheck);
const onInlessonRef = useRef(onInlesson);
const quizRef = useRef(quiz);
```

Add to the refs update effect (around line 76):

```typescript
onConceptCheckRef.current = onConceptCheck;
onInlessonRef.current = onInlesson;
quizRef.current = quiz;
```

Add new function `checkForAssessmentTriggers` after `checkForFATriggersInternal` (around line 159):

```typescript
const checkForAssessmentTriggersInternal = useCallback((currentTimeMs: number) => {
  const currentQuiz = quizRef.current;
  if (!currentQuiz) return;

  const currentTimeSec = currentTimeMs / 1000;

  // Check inlesson triggers
  for (const question of currentQuiz.inlesson) {
    if (triggeredInlessonRef.current.has(question.id)) continue;

    if (Math.abs(currentTimeSec - question.timestamp) < 0.5) {
      console.log(`Inlesson trigger at ${question.timestamp}s: ${question.question}`);
      triggeredInlessonRef.current.add(question.id);

      // Pause video
      if (playerRef.current?.pauseVideo) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
      }

      onInlessonRef.current?.(question);
      return;
    }
  }

  // Check concept check triggers (chapter end)
  for (const chapter of currentQuiz.chapters) {
    if (!chapter.concept_check_enabled) continue;
    if (triggeredChaptersRef.current.has(chapter.id)) continue;

    if (Math.abs(currentTimeSec - chapter.end_timestamp) < 0.5) {
      console.log(`Concept check trigger at chapter end: ${chapter.title}`);
      triggeredChaptersRef.current.add(chapter.id);

      // Pause video
      if (playerRef.current?.pauseVideo) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
      }

      onConceptCheckRef.current?.(chapter);
      return;
    }
  }
}, []);
```

Update `handlePlayerTimeUpdate` to call the new function (around line 191):

```typescript
const handlePlayerTimeUpdate = () => {
  if (playerRef.current) {
    const currentTimeMs = playerRef.current.getCurrentTime();
    const currentBookmarks = bookmarksRef.current;
    const currentIsPlaying = isPlayingRef.current;

    // Check for FA triggers (existing)
    if (currentBookmarks.length > 0 && currentIsPlaying) {
      checkForFATriggersInternal(currentTimeMs, currentBookmarks);
    }

    // Check for assessment triggers (new)
    if (currentIsPlaying) {
      checkForAssessmentTriggersInternal(currentTimeMs);
    }
  }
};
```

Add resume function to returned object:

```typescript
const resumeVideo = useCallback(() => {
  if (playerRef.current) {
    if (playerRef.current.playVideo) {
      playerRef.current.playVideo();
    } else if (playerRef.current.setState) {
      playerRef.current.setState(PLAYER_STATE.PLAYING);
    }
    setIsPlaying(true);
  }
}, []);
```

Update return statement to include `resumeVideo`.

**Step 1.5: Add trigger reset on video seek**

When users seek backward past a trigger point, the assessment should re-trigger. Add a function to reset triggers for timestamps ahead of the seek position:

```typescript
/**
 * Reset assessment triggers that are ahead of the given timestamp.
 * Called when user seeks backward to allow re-triggering assessments.
 */
const resetTriggersAfterTimestamp = useCallback((timestampSec: number) => {
  const currentQuiz = quizRef.current;
  if (!currentQuiz) return;

  // Reset inlesson triggers that are past the new timestamp
  currentQuiz.inlesson.forEach((question) => {
    if (question.timestamp > timestampSec) {
      triggeredInlessonRef.current.delete(question.id);
      console.log(`Reset inlesson trigger for ${question.id} at ${question.timestamp}s`);
    }
  });

  // Reset chapter triggers that are past the new timestamp
  currentQuiz.chapters.forEach((chapter) => {
    if (chapter.end_timestamp > timestampSec) {
      triggeredChaptersRef.current.delete(chapter.id);
      console.log(`Reset chapter trigger for ${chapter.id} at ${chapter.end_timestamp}s`);
    }
  });

  // Also reset FA bookmark triggers that are past the new timestamp
  const currentBookmarks = bookmarksRef.current;
  currentBookmarks.forEach((bookmark) => {
    const bookmarkId = bookmark.id || `${bookmark.rel_offset}`;
    const bookmarkTimeSec = bookmark.rel_offset / 1000;
    if (bookmarkTimeSec > timestampSec) {
      triggeredBookmarksRef.current.delete(bookmarkId);
      console.log(`Reset bookmark trigger for ${bookmarkId} at ${bookmarkTimeSec}s`);
    }
  });
}, []);
```

Modify the existing `seekTo` function to call reset logic:

```typescript
const seekTo = useCallback((seconds: number) => {
  if (playerRef.current) {
    const currentTimeSec = playerRef.current.getCurrentTime() / 1000;

    // If seeking backward, reset triggers that are ahead of new position
    if (seconds < currentTimeSec) {
      resetTriggersAfterTimestamp(seconds);
    }

    playerRef.current.seekTo(seconds * 1000); // Convert to milliseconds
    console.log(`Seeking to ${seconds} seconds`);
    return true;
  }
  return false;
}, [resetTriggersAfterTimestamp]);
```

**Note:** The `resetTriggersAfterTimestamp` function ensures that:
- Assessments can re-trigger if user seeks backward past them
- Assessments that have already been passed don't re-trigger on forward seek
- Both inlesson questions and concept checks are handled

**Step 2: Commit**

```bash
git add hooks/useKPointPlayer.ts
git commit -m "feat(hooks): add assessment trigger support to useKPointPlayer"
```

---

## Phase 4: Integration with ModuleContent

### Task 12: Integrate Assessment System into ModuleContent

**Files:**
- Modify: `components/app/(learning)/course/[courseId]/module/[moduleId]/ModuleContent.tsx`

**Step 1: Add imports**

Add these imports at the top of the file (after existing imports around line 21):

```typescript
// Assessment imports
import { AssessmentProvider, useAssessment } from "@/contexts/AssessmentContext";
import {
  WarmupQuiz,
  ConceptCheck,
  InLessonQuestion,
  FormativeAssessment,
  LearningSummary,
} from "@/components/assessment";
import type { LessonQuiz, Chapter, InlessonQuestion as InlessonQuestionType } from "@/types/assessment";
```

**Step 2: Update Lesson interface to include quiz**

Update the Lesson interface (around line 23):

```typescript
interface Lesson {
  id: string;
  title: string;
  orderIndex: number;
  kpointVideoId?: string | null;
  youtubeVideoId?: string | null;
  description?: string | null;
  quiz?: LessonQuiz | null; // Add quiz field
}
```

**Step 3: Add assessment state and handlers**

Add these state variables after existing state (around line 89):

```typescript
// Assessment state
const [activeAssessmentPhase, setActiveAssessmentPhase] = useState<
  "idle" | "warmup" | "concept_check" | "inlesson" | "formative" | "summary"
>("idle");
const [activeInlessonQuestion, setActiveInlessonQuestion] = useState<InlessonQuestionType | null>(null);
const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
const [agentAssessmentResponse, setAgentAssessmentResponse] = useState<string | null>(null);

// Parse quiz data from active lesson
const lessonQuiz: LessonQuiz | null = useMemo(() => {
  if (!activeLesson?.quiz) return null;
  try {
    // quiz is already parsed JSON from Prisma
    return activeLesson.quiz as LessonQuiz;
  } catch {
    console.error("Failed to parse lesson quiz data");
    return null;
  }
}, [activeLesson?.quiz]);
```

**Step 4: Add assessment trigger handlers**

Add these handlers after the FA intro handlers (around line 600):

```typescript
// Handle concept check trigger from video player
const handleConceptCheck = useCallback((chapter: Chapter) => {
  console.log("[ModuleContent] Concept check triggered for chapter:", chapter.title);
  setActiveChapter(chapter);
  setActiveAssessmentPhase("concept_check");

  // Send to agent for Sarvam-generated questions
  if (liveKit.isConnected) {
    const message = `ASSESSMENT:${JSON.stringify({
      type: "CONCEPT_CHECK",
      data: { chapter }
    })}`;
    liveKit.sendTextToAgent(message);
  }
}, [liveKit.isConnected, liveKit.sendTextToAgent]);

// Handle inlesson question trigger from video player
const handleInlesson = useCallback((question: InlessonQuestionType) => {
  console.log("[ModuleContent] Inlesson question triggered:", question.question);
  setActiveInlessonQuestion(question);
  setActiveAssessmentPhase("inlesson");
}, []);

// Handle assessment complete - resume video
const handleAssessmentComplete = useCallback(() => {
  console.log("[ModuleContent] Assessment complete, resuming video");
  setActiveAssessmentPhase("idle");
  setActiveInlessonQuestion(null);
  setActiveChapter(null);
  setAgentAssessmentResponse(null);

  // Resume video
  if (playerRef.current?.playVideo) {
    playerRef.current.playVideo();
  }
}, [playerRef]);

// Handle warmup start
const handleStartWarmup = useCallback(() => {
  setActiveAssessmentPhase("warmup");
}, []);

// Handle warmup complete
const handleWarmupComplete = useCallback(() => {
  setActiveAssessmentPhase("idle");
  // Video will start playing after warmup
}, []);

// Handle formative start
const handleStartFormative = useCallback(() => {
  setActiveAssessmentPhase("formative");

  if (liveKit.isConnected) {
    const message = `ASSESSMENT:${JSON.stringify({
      type: "FORMATIVE_START",
      data: { lessonId: activeLesson?.id }
    })}`;
    liveKit.sendTextToAgent(message);
  }
}, [liveKit.isConnected, liveKit.sendTextToAgent, activeLesson?.id]);

// Handle formative complete
const handleFormativeComplete = useCallback(() => {
  setActiveAssessmentPhase("summary");
}, []);

// Handle sending assessment answer to agent
const handleSendAssessmentToAgent = useCallback((message: string) => {
  if (liveKit.isConnected) {
    liveKit.sendTextToAgent(message);
  }
}, [liveKit.isConnected, liveKit.sendTextToAgent]);
```

**Step 5: Update useKPointPlayer to include assessment triggers**

Update the useKPointPlayer call (around line 453):

```typescript
// KPoint player hook with FA trigger and assessment integration
const { seekTo, getCurrentTime, isPlayerReady, isPlaying, playerRef, resumeVideo } = useKPointPlayer({
  kpointVideoId: selectedLesson?.kpointVideoId,
  onVideoEnd: handleVideoEnd,
  onConceptCheck: handleConceptCheck, // NEW: concept check trigger
  onInlesson: handleInlesson, // NEW: inlesson trigger
  quiz: lessonQuiz, // NEW: pass quiz data for timestamp detection
  onFATrigger: async (_message: string, _timestampSeconds: number, topic?: string, _pauseVideo?: boolean) => {
    // ... existing FA trigger code
  },
});
```

**Step 6: Add assessment UI rendering**

Add this component before the `content` variable (around line 650):

```typescript
// Assessment UI based on current phase
const assessmentUI = useMemo(() => {
  if (!lessonQuiz) return null;

  switch (activeAssessmentPhase) {
    case "warmup":
      return (
        <div className="p-4 bg-white rounded-lg shadow-md mb-4">
          <WarmupQuiz onComplete={handleWarmupComplete} />
        </div>
      );

    case "concept_check":
      if (!activeChapter) return null;
      return (
        <div className="p-4 bg-white rounded-lg shadow-md mb-4">
          <ConceptCheck
            chapter={activeChapter}
            onComplete={handleAssessmentComplete}
            onSendToAgent={handleSendAssessmentToAgent}
            agentResponse={agentAssessmentResponse}
          />
        </div>
      );

    case "inlesson":
      if (!activeInlessonQuestion) return null;
      return (
        <div className="p-4 bg-white rounded-lg shadow-md mb-4">
          <InLessonQuestion
            question={activeInlessonQuestion}
            onComplete={handleAssessmentComplete}
            onSendToAgent={handleSendAssessmentToAgent}
            agentResponse={agentAssessmentResponse}
          />
        </div>
      );

    case "formative":
      return (
        <div className="p-4 bg-white rounded-lg shadow-md mb-4">
          <FormativeAssessment
            onComplete={handleFormativeComplete}
            onSendToAgent={handleSendAssessmentToAgent}
            agentResponse={agentAssessmentResponse}
          />
        </div>
      );

    case "summary":
      return (
        <div className="p-4 bg-white rounded-lg shadow-md mb-4">
          <LearningSummary
            onReviewNow={() => {
              // TODO: Navigate to review content
              console.log("Review now clicked");
            }}
            onContinue={() => {
              setActiveAssessmentPhase("idle");
              handleVideoEnd(); // Move to next lesson
            }}
          />
        </div>
      );

    default:
      return null;
  }
}, [
  lessonQuiz,
  activeAssessmentPhase,
  activeChapter,
  activeInlessonQuestion,
  agentAssessmentResponse,
  handleWarmupComplete,
  handleAssessmentComplete,
  handleSendAssessmentToAgent,
  handleFormativeComplete,
  handleVideoEnd,
]);
```

**Step 7: Update content to include assessment UI**

Update the content variable (around line 686) to include assessmentUI:

```typescript
const content = (
  <div className="space-y-6 pb-3">
    {/* Assessment UI - shows above chat when active */}
    {assessmentUI}

    {/* AI Welcome Agent */}
    <ChatAgent
      // ... existing props
    />
  </div>
);
```

**Step 8: Wrap return with AssessmentProvider**

Update the return statement (around line 750):

```typescript
return (
  <AssessmentProvider
    lessonId={activeLesson?.id || ""}
    userId={userId}
    quiz={lessonQuiz}
  >
    <>
      <AnimatedBackground variant="full" intensity="medium" theme="learning" />
      <OnboardingModal isReturningUser={isReturningUser} />
      <Script
        src="https://assets.zencite.in/orca/media/embed/videofront-vega.js"
        strategy="afterInteractive"
      />
      <ResizableContent
        header={header}
        content={content}
        footer={footer}
        rightPanel={rightPanel}
      />
    </>
  </AssessmentProvider>
);
```

**Step 9: Handle agent assessment responses**

Add handler for agent assessment responses in the transcript callback (update handleTranscriptCallback around line 186):

```typescript
// Inside handleTranscriptCallback, add check for assessment responses
if (segment.isFinal && segment.text.startsWith("ASSESSMENT_RESPONSE:")) {
  try {
    const responseData = JSON.parse(segment.text.replace("ASSESSMENT_RESPONSE:", ""));
    setAgentAssessmentResponse(responseData.feedback);
    // Clear transcript so it doesn't appear in regular chat
    setTimeout(() => {
      if (clearAgentTranscriptRef.current) {
        clearAgentTranscriptRef.current();
      }
    }, 100);
    return; // Don't process as regular message
  } catch (e) {
    console.error("Failed to parse assessment response:", e);
  }
}
```

**Step 2: Commit**

```bash
git add components/app/(learning)/course/[courseId]/module/[moduleId]/ModuleContent.tsx
git commit -m "feat(learning): integrate assessment system into ModuleContent"
```

---

## Phase 5: Testing & Validation

### Task 13: Add Sample Quiz Data to Lesson

**Files:**
- Create migration or seed script to add sample quiz data

**Step 1: Create a test script**

```typescript
// scripts/add-sample-quiz.ts
import { prisma } from "../lib/prisma";

const sampleQuiz = {
  chapters: [
    {
      id: "ch1",
      title: "Iteration & Variables",
      start_timestamp: 0,
      end_timestamp: 359,
      description: "Learn about iteration patterns and variable initialization",
      concept_check_enabled: true,
    },
  ],
  warmup: [
    {
      id: "w1",
      question: "Which of the following is NOT essential for a simplified report-card?",
      options: [
        { id: "A", text: "Student's name" },
        { id: "B", text: "Date of birth" },
        { id: "C", text: "GST number of the school" },
        { id: "D", text: "Marks in three subjects" },
      ],
      correct_option: "C",
      feedback: "The GST number is relevant to shopping bills, not to the simplified report-card.",
      chapter_id: "ch1",
    },
  ],
  inlesson: [
    {
      id: "il1",
      question: "Are there better ways to pick cards from this pile?",
      timestamp: 200,
      type: "text",
      chapter_id: "ch1",
    },
  ],
};

async function main() {
  // Update a specific lesson with sample quiz data
  await prisma.lesson.update({
    where: { id: "YOUR_LESSON_ID" },
    data: { quiz: sampleQuiz },
  });

  console.log("Sample quiz data added");
}

main();
```

**Step 2: Run and validate**

```bash
bun run scripts/add-sample-quiz.ts
```

**Step 3: Manual testing checklist**
- [ ] Warmup quiz displays correctly
- [ ] Video triggers inlesson questions at timestamps
- [ ] Concept checks trigger at chapter end
- [ ] Answers are stored in database
- [ ] Learning summary generates correctly

---

## Phase 5: Agent Integration

### Task 14: Update BODH Agent for Assessment Messages

**Files:**
- Modify: `lib/livekit/agent.py` (or equivalent agent implementation file)

**Context:** The BODH LiveKit agent needs to handle new assessment-related message types to coordinate concept checks, formative assessments, and provide real-time feedback through Sarvam QnA and FA APIs.

**Step 1: Add message type handlers**

The agent should handle these message types from the client:

```python
# Message types to handle
ASSESSMENT_MESSAGE_TYPES = {
    "CONCEPT_CHECK": "concept_check",           # Start concept check for chapter
    "CONCEPT_CHECK_ANSWER": "concept_check_answer",  # User answer to concept check
    "CONCEPT_CHECK_SKIP": "concept_check_skip",     # User skips concept check
    "FORMATIVE_QUESTION": "formative_question",  # Generate formative question
    "FORMATIVE_ANSWER": "formative_answer",      # User answer to formative
    "INLESSON_QUESTION": "inlesson_question",    # Text/voice answer to inlesson
}

async def handle_assessment_message(self, msg_type: str, payload: dict) -> dict:
    """Handle assessment-related messages from client."""

    if msg_type == "CONCEPT_CHECK":
        # Request Sarvam QnA to generate a question about the chapter topic
        chapter_id = payload["chapterId"]
        topic = payload["topic"]
        return await self.generate_concept_check_question(chapter_id, topic)

    elif msg_type == "CONCEPT_CHECK_ANSWER":
        # Send answer to Sarvam QnA for evaluation
        user_answer = payload["answer"]
        question = payload["question"]
        return await self.evaluate_concept_check_answer(user_answer, question)

    elif msg_type == "CONCEPT_CHECK_SKIP":
        # Acknowledge skip, no Sarvam call needed
        return {"status": "skipped", "canProceed": True}

    elif msg_type == "FORMATIVE_QUESTION":
        # Use Sarvam FA to generate formative assessment question
        topic = payload.get("topic")
        timestamp = payload.get("timestamp")
        return await self.generate_formative_question(topic, timestamp)

    elif msg_type == "FORMATIVE_ANSWER":
        # Evaluate answer using Sarvam FA
        user_answer = payload["answer"]
        question = payload["question"]
        return await self.evaluate_formative_answer(user_answer, question)

    elif msg_type == "INLESSON_QUESTION":
        # Handle in-lesson question (usually just acknowledge receipt)
        return {"status": "received"}
```

**Step 2: Add retry helper for Sarvam API calls**

```python
import asyncio
from typing import Callable, TypeVar, Any

T = TypeVar('T')

# Configuration for Sarvam API retry logic
SARVAM_RETRY_CONFIG = {
    "max_retries": 3,
    "initial_delay": 1.0,  # seconds
    "max_delay": 10.0,     # seconds
    "backoff_factor": 2.0,
}

async def retry_with_backoff(
    func: Callable[..., T],
    *args,
    max_retries: int = SARVAM_RETRY_CONFIG["max_retries"],
    initial_delay: float = SARVAM_RETRY_CONFIG["initial_delay"],
    max_delay: float = SARVAM_RETRY_CONFIG["max_delay"],
    backoff_factor: float = SARVAM_RETRY_CONFIG["backoff_factor"],
    **kwargs
) -> T:
    """
    Retry an async function with exponential backoff.

    Args:
        func: Async function to call
        max_retries: Maximum number of retry attempts
        initial_delay: Initial delay between retries in seconds
        max_delay: Maximum delay between retries in seconds
        backoff_factor: Multiplier for delay after each retry

    Returns:
        Result from the function

    Raises:
        Last exception if all retries fail
    """
    last_exception = None
    delay = initial_delay

    for attempt in range(max_retries + 1):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            last_exception = e
            if attempt == max_retries:
                break

            # Log retry attempt
            print(f"[Sarvam API] Attempt {attempt + 1} failed: {e}. Retrying in {delay}s...")

            await asyncio.sleep(delay)
            delay = min(delay * backoff_factor, max_delay)

    raise last_exception
```

**Step 3: Implement Sarvam API integration methods with retry**

```python
async def generate_concept_check_question(self, chapter_id: str, topic: str) -> dict:
    """Generate a concept check question using Sarvam QnA."""
    try:
        prompt = f"Generate a concept check question about: {topic}"
        response = await retry_with_backoff(self.sarvam_client.qna, prompt)
        return {
            "type": "CONCEPT_CHECK_QUESTION",
            "question": response.get("question", ""),
            "chapterId": chapter_id,
        }
    except Exception as e:
        print(f"[generate_concept_check_question] Failed after retries: {e}")
        return {
            "type": "CONCEPT_CHECK_ERROR",
            "error": "Failed to generate question. Please try again.",
            "chapterId": chapter_id,
        }

async def evaluate_concept_check_answer(self, answer: str, question: str) -> dict:
    """Evaluate user's concept check answer using Sarvam QnA."""
    try:
        response = await retry_with_backoff(
            self.sarvam_client.qna_evaluate,
            question=question,
            answer=answer
        )
        return {
            "type": "CONCEPT_CHECK_FEEDBACK",
            "isCorrect": response.get("is_correct"),
            "feedback": response.get("feedback", ""),
        }
    except Exception as e:
        print(f"[evaluate_concept_check_answer] Failed after retries: {e}")
        return {
            "type": "CONCEPT_CHECK_FEEDBACK",
            "isCorrect": None,
            "feedback": "Unable to evaluate your answer. Let's move on.",
            "error": True,
        }

async def generate_formative_question(self, topic: str, timestamp: float) -> dict:
    """Generate formative assessment using Sarvam FA."""
    try:
        response = await retry_with_backoff(
            self.sarvam_client.fa,
            topic=topic,
            context=f"At timestamp {timestamp}"
        )
        return {
            "type": "FORMATIVE_QUESTION",
            "question": response.get("question", ""),
            "topic": topic,
        }
    except Exception as e:
        print(f"[generate_formative_question] Failed after retries: {e}")
        return {
            "type": "FORMATIVE_ERROR",
            "error": "Failed to generate assessment. Please try again.",
            "topic": topic,
        }

async def evaluate_formative_answer(self, answer: str, question: str) -> dict:
    """Evaluate formative answer using Sarvam FA."""
    try:
        response = await retry_with_backoff(
            self.sarvam_client.fa_evaluate,
            question=question,
            answer=answer
        )
        return {
            "type": "FORMATIVE_FEEDBACK",
            "isCorrect": response.get("is_correct"),
            "feedback": response.get("feedback", ""),
        }
    except Exception as e:
        print(f"[evaluate_formative_answer] Failed after retries: {e}")
        return {
            "type": "FORMATIVE_FEEDBACK",
            "isCorrect": None,
            "feedback": "Unable to evaluate your answer. Let's continue.",
            "error": True,
        }
```

**Step 3: Add message routing to main handler**

```python
async def on_data_received(self, data: dict):
    """Main message handler - route to appropriate handler."""
    msg_type = data.get("type", "")

    if msg_type in ASSESSMENT_MESSAGE_TYPES:
        response = await self.handle_assessment_message(msg_type, data.get("payload", {}))
        await self.send_data(response)
    else:
        # Existing chat/conversation handling
        await self.handle_chat_message(data)
```

**Step 4: Test the agent integration**

```bash
# Start the agent in development mode
cd /path/to/agent
python -m livekit.agents dev agent.py

# Test with a sample message from the client
# The ModuleContent component should send messages and receive responses
```

**Step 5: Commit**

```bash
git add lib/livekit/agent.py
git commit -m "feat(agent): add assessment message handlers for Sarvam integration"
```

---

### Task 15: Add Sample Quiz Data to Lesson

**Note:** This was previously Task 13, renumbered after adding Task 14.

---

## Summary

**Total Tasks:** 15

**Phase 1 (Foundation):** Tasks 1-3
- Types, Prisma models, Server actions

**Phase 2 (Components):** Tasks 4-10
- AssessmentProvider, QuizQuestion, QuizFeedback, WarmupQuiz, ConceptCheck, InLessonQuestion, FormativeAssessment, LearningSummary

**Phase 3 (Video Integration):** Task 11
- Update useKPointPlayer for assessment triggers

**Phase 4 (Integration):** Task 12
- Integrate into ModuleContent

**Phase 5 (Agent Integration):** Task 14
- Update BODH Agent for assessment message types

**Phase 6 (Testing):** Task 15
- Sample data and validation

---

## Execution Notes

- Run `./node_modules/.bin/prisma db push` after Task 2
- Test each component in isolation before integration
- Use browser dev tools to monitor LiveKit data channel messages
- Check Prisma Studio (`./node_modules/.bin/prisma studio`) to verify data storage

### Sarvam Response Handling

**Existing code reuse:** `lib/chat/assessment.ts` contains `detectAnswerFeedback()` function (lines 297-378) that parses Sarvam's natural language responses to determine correctness:

| Pattern Type | Keywords |
|--------------|----------|
| Correct | 'correct', 'that's right', 'exactly', 'well done', 'great job', 'perfect', 'you got it', 'spot on' |
| Incorrect | 'incorrect', 'not quite', 'wrong', 'actually', 'the correct answer', 'unfortunately', 'try again' |

**Logic:** Searches first 200 characters for patterns. If both found, whichever appears first wins. Returns `null` if uncertain.

**New wrapper:** `parseSarvamFeedback()` in `actions/assessment.ts` wraps this function and returns `{ isCorrect: boolean | null, feedback: string }`.

### Migration Strategy

**Phase 1: Database Schema (Non-Breaking)**

1. Run `prisma db push` to add new AssessmentAttempt and AssessmentSession tables
2. No existing tables are modified - this is additive only
3. Existing lessons continue to work without quiz data

**Phase 2: Backend Deployment**

1. Deploy server actions (`actions/assessment.ts`) - they're new files, no conflicts
2. Deploy types (`types/assessment.ts`) - new file, no conflicts
3. Update BODH agent with assessment message handlers - the agent can coexist with existing functionality

**Phase 3: Frontend Deployment**

1. Deploy assessment components - new files in `components/assessment/`
2. Deploy updated context provider - wrap existing content, doesn't break current behavior
3. Deploy updated `useKPointPlayer.ts` - adds optional props, backwards compatible

**Phase 4: Feature Flag Rollout (Recommended)**

Consider adding a feature flag to control assessment visibility:

```typescript
// In AssessmentProvider or ModuleContent
const assessmentEnabled = process.env.NEXT_PUBLIC_ASSESSMENT_ENABLED === "true";

// Conditionally render assessment UI
{assessmentEnabled && quiz && (
  <AssessmentProvider ...>
    {/* Assessment components */}
  </AssessmentProvider>
)}
```

**Phase 5: Data Migration (Optional)**

If existing lessons need quiz data:

```sql
-- Add quiz JSON to lessons that need it
UPDATE "Lesson"
SET quiz = '{"chapters":[],"warmup":[],"inlesson":[]}'::jsonb
WHERE quiz IS NULL;
```

**Rollback Plan:**

1. Set `NEXT_PUBLIC_ASSESSMENT_ENABLED=false` to disable UI
2. Assessment data in database is isolated and doesn't affect core functionality
3. Remove AssessmentProvider wrapper to restore original ModuleContent behavior

### Future Enhancements (Out of Scope for Initial Release)

**1. Analytics & Telemetry**

Track assessment engagement metrics for learning insights:

```typescript
// Example analytics events to implement later
interface AssessmentAnalytics {
  // Session metrics
  sessionStarted: { userId: string; lessonId: string; timestamp: Date };
  sessionCompleted: { userId: string; lessonId: string; duration: number };

  // Question metrics
  questionAnswered: {
    questionId: string;
    questionType: "warmup" | "concept_check" | "inlesson" | "formative";
    timeToAnswer: number;  // milliseconds
    isCorrect: boolean;
    attemptNumber: number;
  };
  questionSkipped: { questionId: string; questionType: string };

  // Engagement metrics
  videoWatchTime: { lessonId: string; totalSeconds: number; pauseCount: number };
  conceptCheckEngagement: { chapterId: string; questionsAnswered: number; correctRate: number };
}
```

Consider integrating with:
- PostHog for product analytics
- Custom dashboard for learning analytics
- Export to LMS systems (xAPI/SCORM)

**2. End-to-End Testing**

Create Playwright tests for critical user flows:

```typescript
// tests/assessment.spec.ts - future implementation
test.describe("Formative Assessment Flow", () => {
  test("warmup quiz completion", async ({ page }) => {
    // Navigate to lesson with quiz
    // Verify warmup modal appears
    // Answer questions
    // Verify feedback display
    // Verify progression to video
  });

  test("concept check at chapter end", async ({ page }) => {
    // Seek video to chapter end timestamp
    // Verify concept check modal appears
    // Test answer submission
    // Verify video resumes after completion
  });

  test("in-lesson question interruption", async ({ page }) => {
    // Verify video pauses at question timestamp
    // Submit text answer
    // Verify feedback from Sarvam
    // Verify video continues
  });

  test("learning summary generation", async ({ page }) => {
    // Complete multiple assessments
    // Trigger summary generation
    // Verify chapters understood vs to review
    // Verify suggested resources display
  });
});
```

**3. Voice Transcription Strategy**

Voice input is supported via LiveKit's audio track. For transcription:

**Option A: Agent-side Sarvam STT (Recommended)**
- User speaks into LiveKit room
- BODH agent receives audio stream
- Agent calls Sarvam STT API for transcription
- Agent sends transcribed text back to client
- Client displays transcription and processes as text input

**Option B: Client-side Web Speech API (Fallback)**
```typescript
// Browser's built-in speech recognition (limited multilingual support)
const recognition = new webkitSpeechRecognition();
recognition.lang = "hi-IN"; // Hindi
recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  setTextInput(transcript);
};
```

**Option C: Hybrid Approach**
- Use client-side for real-time display of transcription
- Confirm with agent-side Sarvam STT for accuracy
- Handle language switching (Hindi/English) based on user preference

**4. Multilingual Support**

The design doc mentions Hindi support (script_mockup.txt lines 127-138). Implementation notes:

- Store user's preferred language in session/profile
- TTS already uses OpenAI with language support
- Sarvam API supports Hindi responses
- Consider adding Devanagari text rendering in feedback components
