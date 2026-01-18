# Formative Assessment System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a unified assessment system with warmup quizzes, concept checks, in-lesson questions, formative assessments, and learning summaries.

**Architecture:** React context manages assessment session state. Video player triggers assessments at timestamps. Frontend sends assessment messages to BODH agent via LiveKit. Agent responds with questions/feedback via data channel. All attempts stored in PostgreSQL.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma 7, LiveKit, TailwindCSS, shadcn/ui

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
import type { LearningSummary, LessonQuiz, ChapterResult } from "@/types/assessment";

/**
 * Get or create assessment session for a user+lesson
 */
export async function getOrCreateAssessmentSession(userId: string, lessonId: string) {
  const existing = await prisma.assessmentSession.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  });

  if (existing) {
    return existing;
  }

  return prisma.assessmentSession.create({
    data: {
      userId,
      lessonId,
      phase: "idle",
    },
  });
}

/**
 * Update assessment session phase
 */
export async function updateAssessmentPhase(
  userId: string,
  lessonId: string,
  phase: string
) {
  return prisma.assessmentSession.update({
    where: { userId_lessonId: { userId, lessonId } },
    data: { phase },
  });
}

/**
 * Mark warmup as completed or skipped
 */
export async function completeWarmup(
  userId: string,
  lessonId: string,
  skipped: boolean
) {
  return prisma.assessmentSession.update({
    where: { userId_lessonId: { userId, lessonId } },
    data: {
      warmupCompleted: !skipped,
      warmupSkipped: skipped,
      phase: "video",
    },
  });
}

/**
 * Mark concept check as completed
 */
export async function completeConceptCheck(
  userId: string,
  lessonId: string,
  chapterId: string,
  skipped: boolean
) {
  const session = await prisma.assessmentSession.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  });

  const completed = session?.conceptChecksCompleted || [];
  if (!completed.includes(chapterId)) {
    completed.push(chapterId);
  }

  return prisma.assessmentSession.update({
    where: { userId_lessonId: { userId, lessonId } },
    data: {
      conceptChecksCompleted: completed,
      phase: "video",
    },
  });
}

/**
 * Mark inlesson question as completed
 */
export async function completeInlesson(
  userId: string,
  lessonId: string,
  questionId: string
) {
  const session = await prisma.assessmentSession.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  });

  const completed = session?.inlessonCompleted || [];
  if (!completed.includes(questionId)) {
    completed.push(questionId);
  }

  return prisma.assessmentSession.update({
    where: { userId_lessonId: { userId, lessonId } },
    data: {
      inlessonCompleted: completed,
      phase: "video",
    },
  });
}

/**
 * Mark formative assessment as completed
 */
export async function completeFormative(
  userId: string,
  lessonId: string,
  skipped: boolean
) {
  return prisma.assessmentSession.update({
    where: { userId_lessonId: { userId, lessonId } },
    data: {
      formativeCompleted: !skipped,
      formativeSkipped: skipped,
      phase: "summary",
      completedAt: new Date(),
    },
  });
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
}) {
  return prisma.assessmentAttempt.create({ data });
}

/**
 * Get all assessment attempts for a lesson
 */
export async function getAssessmentAttempts(userId: string, lessonId: string) {
  return prisma.assessmentAttempt.findMany({
    where: { userId, lessonId },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Generate learning summary from assessment attempts
 */
export async function generateLearningSummary(
  userId: string,
  lessonId: string,
  quiz: LessonQuiz
): Promise<LearningSummary> {
  const attempts = await getAssessmentAttempts(userId, lessonId);

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

    if (correctRate >= 0.7) {
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
    chaptersUnderstood,
    chaptersToReview,
    overallScore: answered.length > 0 ? correct / answered.length : 0,
    totalQuestions: attempts.length,
    correctAnswers: correct,
    skippedQuestions: attempts.filter((a) => a.isSkipped).length,
  };
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
      const question = quiz?.warmup.find((q) => q.id === questionId);
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

      // Move to next question or complete
      if (state.warmup.currentIndex + 1 < (quiz?.warmup.length || 0)) {
        dispatch({ type: "WARMUP_NEXT" });
      } else {
        dispatch({ type: "WARMUP_COMPLETE", skipped: false });
        await completeWarmup(userId, lessonId, false);
      }
    },
    [quiz, userId, lessonId, state.warmup.currentIndex]
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
    const summaryData = await generateLearningSummary(userId, lessonId, quiz);
    setSummary(summaryData);
  }, [userId, lessonId, quiz]);

  const value: AssessmentContextValue = {
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
  };

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

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Mic, MicOff, Send } from "lucide-react";
import { useAssessment } from "@/contexts/AssessmentContext";
import { QuizQuestion } from "./QuizQuestion";
import type { InlessonQuestion as InlessonQuestionType } from "@/types/assessment";

interface InLessonQuestionProps {
  question: InlessonQuestionType;
  onComplete: () => void;
  onSendToAgent: (message: string) => void;
}

export function InLessonQuestion({
  question,
  onComplete,
  onSendToAgent,
}: InLessonQuestionProps) {
  const { answerInlesson, skipInlesson } = useAssessment();
  const [textInput, setTextInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // Voice recording integration would go here
  };

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

### Task 10: Create Assessment Components Index

**Files:**
- Create: `components/assessment/index.ts`

**Step 1: Create the index file**

```typescript
// components/assessment/index.ts
export { QuizQuestion } from "./QuizQuestion";
export { QuizFeedback } from "./QuizFeedback";
export { WarmupQuiz } from "./WarmupQuiz";
export { InLessonQuestion } from "./InLessonQuestion";
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

**Step 2: Commit**

```bash
git add hooks/useKPointPlayer.ts
git commit -m "feat(hooks): add assessment trigger support to useKPointPlayer"
```

---

## Phase 4: Integration with ModuleContent

### Task 12: Integrate Assessment System into ModuleContent

**Files:**
- Modify: `app/(learning)/course/[courseId]/module/[moduleId]/ModuleContent.tsx`

This task requires reading the current ModuleContent file and carefully integrating:
1. Import AssessmentProvider and assessment components
2. Wrap content with AssessmentProvider
3. Parse quiz data from lesson
4. Add assessment UI rendering based on phase
5. Connect video player triggers to assessment context
6. Handle agent messages for assessment responses

**Step 1: Read current file and plan integration points**

The integration involves:
- Adding imports for assessment components and context
- Parsing `lesson.quiz` JSON and passing to AssessmentProvider
- Adding handlers for `onConceptCheck` and `onInlesson` from video player
- Rendering assessment UI based on `state.phase`
- Handling assessment messages in agent communication

**Step 2: Make incremental changes**

(Detailed code changes depend on current ModuleContent.tsx structure)

**Step 3: Commit**

```bash
git add app/(learning)/course/[courseId]/module/[moduleId]/ModuleContent.tsx
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

## Summary

**Total Tasks:** 13

**Phase 1 (Foundation):** Tasks 1-3
- Types, Prisma models, Server actions

**Phase 2 (Components):** Tasks 4-10
- AssessmentProvider, QuizQuestion, QuizFeedback, WarmupQuiz, InLessonQuestion, LearningSummary

**Phase 3 (Video Integration):** Task 11
- Update useKPointPlayer for assessment triggers

**Phase 4 (Integration):** Task 12
- Integrate into ModuleContent

**Phase 5 (Testing):** Task 13
- Sample data and validation

---

## Execution Notes

- Run `./node_modules/.bin/prisma db push` after Task 2
- Test each component in isolation before integration
- Use browser dev tools to monitor LiveKit data channel messages
- Check Prisma Studio (`./node_modules/.bin/prisma studio`) to verify data storage
