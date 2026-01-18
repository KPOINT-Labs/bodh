# Formative Assessment System Design

**Date:** 2026-01-18
**Status:** Draft
**Author:** Claude (with Aditya)

## Overview

A unified assessment system for the BODH learning platform that supports multiple assessment types throughout the lesson flow: warmup quizzes, concept checks, in-lesson professor questions, formative assessments, and personalized learning summaries.

## Assessment Types Summary

| Type | Trigger | Question Source | Feedback Source | Sarvam Tool |
|------|---------|-----------------|-----------------|-------------|
| **Warmup** | User clicks "Start warmup" | DB | DB | None |
| **Concept Check** | Auto at `chapter.end_timestamp` | Sarvam | Sarvam | QnA (with chapter context) |
| **Inlesson (mcq)** | Auto at `inlesson.timestamp` | DB | Sarvam | QnA |
| **Inlesson (text)** | Auto at `inlesson.timestamp` | DB | Sarvam | QnA |
| **Formative** | User clicks "Start quick check" | Sarvam | Sarvam | FA |
| **Learning Summary** | After formative completes | Session data | Sarvam | FA |

## Quiz Data Structure

### Updated `Lesson.quiz` JSON Schema

```json
{
  "chapters": [
    {
      "id": "ch1",
      "title": "Iteration & Variables",
      "start_timestamp": 0,
      "end_timestamp": 359,
      "description": "Learn about iteration patterns, variable initialization, and step updates",
      "concept_check_enabled": true
    },
    {
      "id": "ch2",
      "title": "Sum & Average (Accumulation)",
      "start_timestamp": 360,
      "end_timestamp": 671,
      "description": "Accumulation using sum and count to compute averages",
      "concept_check_enabled": true
    },
    {
      "id": "ch3",
      "title": "Filtering & Filtered Iteration",
      "start_timestamp": 672,
      "end_timestamp": 1000,
      "description": "Selecting items that match conditions during iteration",
      "concept_check_enabled": true
    }
  ],
  "warmup": [
    {
      "id": "w1",
      "question": "Which of the following pieces of information is *not* essential for the simplified report-card format used in the course?",
      "options": [
        {"id": "A", "text": "Student's name"},
        {"id": "B", "text": "Date of birth"},
        {"id": "C", "text": "GST number of the school"},
        {"id": "D", "text": "Marks in three subjects"}
      ],
      "correct_option": "C",
      "feedback": "The GST number is relevant to shopping bills, not to the simplified report-card.",
      "chapter_id": "ch1"
    }
  ],
  "inlesson": [
    {
      "id": "il1",
      "question": "Are there better ways or are there different ways in which one can pick cards from this?",
      "timestamp": 354,
      "type": "text",
      "chapter_id": "ch1"
    },
    {
      "id": "il2",
      "question": "What do you suggest is a good thing to check?",
      "timestamp": 501,
      "type": "mcq",
      "options": [
        {"id": "A", "text": "Max mark ÷ number of students"},
        {"id": "B", "text": "Sum of marks ÷ count of students"},
        {"id": "C", "text": "Count of students ÷ sum"},
        {"id": "D", "text": "Pick the middle mark"}
      ],
      "correct_option": "B",
      "chapter_id": "ch2"
    }
  ]
}
```

### TypeScript Types

```typescript
// types/assessment.ts

interface Chapter {
  id: string;
  title: string;
  start_timestamp: number;
  end_timestamp: number;
  description: string;
  concept_check_enabled: boolean;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: { id: string; text: string }[];
  correct_option: string;
  feedback: string;
  chapter_id?: string;  // Optional - null means cross-chapter
}

interface InlessonQuestion {
  id: string;
  question: string;
  timestamp: number;
  type: "mcq" | "text";
  options?: { id: string; text: string }[];
  correct_option?: string;
  chapter_id?: string;
}

interface LessonQuiz {
  chapters: Chapter[];
  warmup: QuizQuestion[];
  inlesson: InlessonQuestion[];
}
```

## Component Architecture

### New Components

```
components/
├── assessment/
│   ├── AssessmentProvider.tsx    # Context for session state
│   ├── WarmupQuiz.tsx            # Pre-lesson warmup flow
│   ├── ConceptCheck.tsx          # Mid-video checkpoint
│   ├── InLessonQuestion.tsx      # Professor question (mcq or text)
│   ├── FormativeAssessment.tsx   # End-of-lesson assessment
│   ├── LearningSummary.tsx       # Personalized feedback screen
│   ├── QuizQuestion.tsx          # Single MCQ (reusable)
│   └── QuizFeedback.tsx          # Correct/incorrect feedback
```

### Component Responsibilities

| Component | Trigger | Behavior |
|-----------|---------|----------|
| `AssessmentProvider` | Wraps ModuleContent | Holds session state: answers, scores, current phase |
| `WarmupQuiz` | User clicks "Start warmup" | Sequential MCQs, tracks score, AI narrates |
| `ConceptCheck` | Video reaches `chapter.end_timestamp` | Pauses video, Sarvam generates 2 MCQs, resumes on complete |
| `InLessonQuestion` | Video reaches `inlesson.timestamp` | Pauses video, shows MCQ or text input, Sarvam evaluates |
| `FormativeAssessment` | Video ends OR user clicks "Start check" | Sarvam FA generates questions, immediate feedback per question |
| `LearningSummary` | After FormativeAssessment | Shows chapters understood vs needs review |
| `QuizQuestion` | Used by all quiz components | Renders single MCQ with options, handles selection |
| `QuizFeedback` | After answer submitted | Shows correct/incorrect + feedback text, AI speaks |

## State Management

### AssessmentSession Context

```typescript
interface AssessmentSession {
  lessonId: string;
  userId: string;

  // Phase tracking
  phase: 'idle' | 'warmup' | 'video' | 'concept_check' | 'inlesson' | 'formative' | 'summary';

  // Warmup state
  warmup: {
    currentIndex: number;
    answers: QuizAnswer[];
    completed: boolean;
    skipped: boolean;
  };

  // Concept checks state (keyed by chapter id)
  conceptChecks: Record<string, {
    answers: QuizAnswer[];
    completed: boolean;
  }>;

  // In-lesson questions state
  inlesson: Record<string, {
    response: string;
    responseType: 'voice' | 'text';
    aiEvaluation?: string;
    completed: boolean;
    skipped: boolean;
  }>;

  // Formative assessment state
  formative: {
    currentIndex: number;
    answers: QuizAnswer[];
    completed: boolean;
    skipped: boolean;
  };
}

interface QuizAnswer {
  questionId: string;
  selectedOption: string;
  isCorrect: boolean;
  chapter_id?: string;
  timestamp: Date;
}
```

## Video Integration

### Timestamp Detection

```typescript
// In useKPointPlayer.ts

const onTimeUpdate = (currentTime: number) => {
  // Check for inlesson triggers
  for (const inlesson of quiz.inlesson) {
    if (triggeredInlesson.has(inlesson.id)) continue;
    if (Math.abs(currentTime - inlesson.timestamp) < 0.5) {
      triggeredInlesson.add(inlesson.id);
      pauseVideo();
      onInlesson(inlesson);
      return;
    }
  }

  // Check for concept check triggers (chapter end)
  for (const chapter of quiz.chapters) {
    if (!chapter.concept_check_enabled) continue;
    if (triggeredChapters.has(chapter.id)) continue;
    if (Math.abs(currentTime - chapter.end_timestamp) < 0.5) {
      triggeredChapters.add(chapter.id);
      pauseVideo();
      onConceptCheck(chapter);
      return;
    }
  }
};
```

### UI States

| State | Video Panel | Chat Panel | Assessment UI |
|-------|-------------|------------|---------------|
| Playing | Expanded | Normal | Hidden |
| Assessment triggered | Collapsed (thumbnail) | Shows AI message | Visible in chat area |
| Assessment complete | Expanded | Shows feedback | Hidden |

## AI Integration (Separate from LLM Context)

### Assessment Handler Architecture

```python
# Assessment handling completely bypasses LLM context

class AssessmentHandler:
    def __init__(self, agent, sarvam_client, db):
        self.agent = agent
        self.sarvam = sarvam_client
        self.db = db
        self.session_state = {}

    async def speak(self, text):
        """Speak via TTS without adding to LLM context"""
        await self.agent.tts.synthesize(text)
        await self.agent.publish_data({
            "type": "assessment_message",
            "role": "assistant",
            "text": text
        })

    async def handle_message(self, message_type, data):
        """Route assessment messages - bypasses LLM entirely"""
        handlers = {
            "WARMUP_START": self.handle_warmup_start,
            "WARMUP_ANSWER": self.handle_warmup_answer,
            "WARMUP_SKIP": self.handle_warmup_skip,
            "CONCEPT_CHECK": self.handle_concept_check,
            "CONCEPT_CHECK_ANSWER": self.handle_concept_check_answer,
            "INLESSON": self.handle_inlesson,
            "INLESSON_ANSWER": self.handle_inlesson_answer,
            "INLESSON_SKIP": self.handle_inlesson_skip,
            "FORMATIVE_START": self.handle_formative_start,
            "FORMATIVE_ANSWER": self.handle_formative_answer,
            "FORMATIVE_SKIP": self.handle_formative_skip,
        }

        handler = handlers.get(message_type)
        if handler:
            await handler(data)
            return True
        return False
```

### Message Handlers by Type

#### Warmup (DB only)

```python
async def handle_warmup_start(self, quiz_data):
    question = quiz_data["warmup"][0]
    await self.speak(f"Let's do a quick warm-up. {question['question']}")

async def handle_warmup_answer(self, question_id, selected_option):
    question = get_question_by_id(question_id)
    is_correct = selected_option == question["correct_option"]
    await self.speak(question["feedback"])
```

#### Concept Check (Sarvam QnA)

```python
async def handle_concept_check(self, chapter):
    prompt = f"""
    CONCEPT CHECK for chapter: {chapter['title']}
    Description: {chapter['description']}
    Timestamp: {chapter['start_timestamp']}s - {chapter['end_timestamp']}s

    Ask the student 2 questions to verify understanding of this chapter.
    """
    response = await self.call_sarvam_qna(prompt)
    await self.speak(response)
```

#### Inlesson (DB question, Sarvam QnA feedback)

```python
async def handle_inlesson(self, inlesson_data):
    await self.speak(f"The professor asks: {inlesson_data['question']}")

async def handle_inlesson_answer(self, question_data, user_answer):
    prompt = f"""
    PROFESSOR QUESTION at {question_data['timestamp']}s:
    "{question_data['question']}"

    {"Correct answer: " + question_data['correct_option'] if question_data['type'] == 'mcq' else ""}
    Student answered: "{user_answer}"

    Evaluate and provide brief feedback (2-3 sentences).
    """
    response = await self.call_sarvam_qna(prompt)
    await self.speak(response)
```

#### Formative (Sarvam FA)

```python
async def handle_formative_start(self, lesson_data):
    prompt = f"Start formative assessment for lesson: {lesson_data['title']}"
    response = await self.call_sarvam_fa(prompt)
    await self.speak(response)

async def handle_formative_answer(self, user_answer):
    response = await self.call_sarvam_fa(user_answer)
    await self.speak(response)
```

## Database Schema

### Prisma Models

```prisma
model AssessmentAttempt {
  id              String   @id @default(cuid())

  userId          String
  user            User     @relation(fields: [userId], references: [id])
  lessonId        String
  lesson          Lesson   @relation(fields: [lessonId], references: [id])

  assessmentType  String   // "warmup" | "concept_check" | "inlesson" | "formative"
  questionId      String
  questionText    String

  userAnswer      String
  correctAnswer   String?
  isCorrect       Boolean?
  isSkipped       Boolean  @default(false)

  feedback        String?
  feedbackSource  String   // "db" | "sarvam_qna" | "sarvam_fa"

  chapterId       String?

  createdAt       DateTime @default(now())

  @@index([userId, lessonId])
  @@index([userId, lessonId, assessmentType])
}

model AssessmentSession {
  id              String   @id @default(cuid())

  userId          String
  user            User     @relation(fields: [userId], references: [id])
  lessonId        String
  lesson          Lesson   @relation(fields: [lessonId], references: [id])

  phase           String

  warmupCompleted       Boolean @default(false)
  warmupSkipped         Boolean @default(false)
  conceptChecksCompleted String[] @default([])
  inlessonCompleted     String[] @default([])
  formativeCompleted    Boolean @default(false)
  formativeSkipped      Boolean @default(false)

  startedAt       DateTime @default(now())
  completedAt     DateTime?

  @@unique([userId, lessonId])
}
```

## Learning Summary

### Generation Logic

```typescript
interface LearningSummary {
  chaptersUnderstood: {
    id: string;
    title: string;
    correctRate: number;
  }[];
  chaptersToReview: {
    id: string;
    title: string;
    correctRate: number;
    suggestedAids: SuggestedAid[];
  }[];
  overallScore: number;
  totalQuestions: number;
  correctAnswers: number;
  skippedQuestions: number;
}

async function generateLearningSummary(
  userId: string,
  lessonId: string,
  quiz: LessonQuiz
): Promise<LearningSummary> {
  const attempts = await prisma.assessmentAttempt.findMany({
    where: { userId, lessonId }
  });

  // Group by chapter, calculate scores
  // Chapters with >= 70% correct → understood
  // Chapters with < 70% correct → needs review

  return { chaptersUnderstood, chaptersToReview, overallScore, ... };
}
```

### UI Design

```
┌─────────────────────────────────────────────────┐
│ 📊 Your Learning Summary                         │
├─────────────────────────────────────────────────┤
│                                                  │
│ What You Understood Well ✅                      │
│ ┌─────────────────────────────────────────────┐ │
│ │ ✔️ Iteration & Variables          (3/3)     │ │
│ │ ✔️ Sum & Average                  (2/2)     │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ Let's Revisit These 📝                          │
│ ┌─────────────────────────────────────────────┐ │
│ │ ⚠️ Filtering & Filtered Iteration (1/3)     │ │
│ │    Suggested:                               │ │
│ │    📄 2-minute summary    🎬 1-minute reel  │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ Overall: 6/8 correct (75%)                      │
│                                                  │
│ [Review Now (Recommended)]  [Continue to Next]  │
└─────────────────────────────────────────────────┘
```

## Multimodal Support

| Assessment Type | Question Delivery | Answer Input | Feedback Delivery |
|-----------------|-------------------|--------------|-------------------|
| **Warmup MCQ** | Text UI + AI voice | Button click | Text + AI voice |
| **Concept Check** | Text UI + AI voice | Button click | Text + AI voice |
| **Inlesson (mcq)** | Text UI + AI voice | Button click | Text + AI voice |
| **Inlesson (text)** | Text UI + AI voice | Voice OR text | Text + AI voice |
| **Formative** | Text UI + AI voice | Button click / voice | Text + AI voice |
| **Learning Summary** | Text UI + AI voice | - | Text + AI voice |

## Frontend-Agent Communication

### Message Protocol

```typescript
// Frontend sends
sendTextToAgent(`ASSESSMENT:${JSON.stringify({ type, data })}`);

// Message types
"WARMUP_START"           // { lessonId }
"WARMUP_ANSWER"          // { questionId, answer }
"WARMUP_SKIP"            // {}
"CONCEPT_CHECK"          // { chapter }
"CONCEPT_CHECK_ANSWER"   // { answer }
"INLESSON"               // { questionData }
"INLESSON_ANSWER"        // { questionId, answer }
"INLESSON_SKIP"          // { questionId }
"FORMATIVE_START"        // { lessonId }
"FORMATIVE_ANSWER"       // { answer }
"FORMATIVE_SKIP"         // {}
```

### Agent Responses

```typescript
// Agent publishes via data channel
{
  type: "assessment_message",
  role: "assistant",
  text: "...",
  questionData?: {...},  // For MCQ display
  feedbackData?: {...},  // For feedback display
  summaryData?: {...}    // For learning summary
}
```

## Complete Flow Diagram

```
LESSON START
    │
    ▼
WARMUP PHASE
    │ User clicks "Start warmup" or "Skip"
    │ If start: Loop through DB questions with DB feedback
    ▼
VIDEO PHASE
    │ timeupdate listener watches for triggers
    │
    ├─► inlesson.timestamp reached
    │   └─► INLESSON: Pause, show question, Sarvam QnA evaluates, resume
    │
    └─► chapter.end_timestamp reached
        └─► CONCEPT CHECK: Pause, Sarvam generates 2 Qs, resume
    │
    ▼
VIDEO END
    │
    ▼
FORMATIVE ASSESSMENT
    │ User clicks "Start quick check" or "Skip"
    │ If start: Sarvam FA generates questions, immediate feedback per Q
    ▼
LEARNING SUMMARY
    │ Display chapters understood vs needs review
    │ Show suggested review aids
    │ [Review Now] or [Continue to Next Lesson]
    ▼
COMPLETE
```

## Implementation Notes

1. **Assessment interactions are separate from LLM context** - bypasses the agent's LLM entirely
2. **Warmup uses DB only** - no Sarvam calls needed
3. **Concept checks and Formative use Sarvam** - QnA for concept checks, FA for formative
4. **Inlesson questions from DB, feedback from Sarvam QnA**
5. **All assessments support skip** - recorded but doesn't affect scoring negatively
6. **Learning summary generated from session data** - grouped by chapter
7. **Multimodal support** - text UI + AI voice for all interactions

## References

- Script mockup: `/prd_docs/script_mockup.txt`
- Design reference: `/home/aditya/kpoint/Aivideolearningjan26v3`
- BODH agent: `/home/aditya/kpoint/prism2/app/agents/livekit/bodh/`
- LiveKit Agents docs: https://docs.livekit.io/agents/
