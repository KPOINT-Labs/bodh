# Bodh Database Schema Documentation

## Overview

This document describes the database schema for Bodh, an AI-powered educational platform that combines conversational AI with interactive video learning. The schema is designed to support Phases 1-2 of the platform.

## Design Decisions

### Why This Architecture?

1. **Thread → Conversation → Message Hierarchy**
   - **Thread**: One per user per course. Contains the entire learning journey for that course.
   - **Conversation**: Segments within a thread, grouped by lesson or context type (warmup, in_lesson, etc.)
   - **Message**: Individual chat messages with voice and video timestamp support.

   **Why 3 levels instead of 2?**
   - Conversations can be summarized when completed, reducing token usage for LLM prompts
   - AI can access full course context via Thread while sending only relevant summaries + current conversation messages
   - UI can group messages by lesson for better visualization

2. **External Video Storage**
   - Videos are hosted on KPOINT or YouTube (external)
   - We only store `kpointVideoId`, `youtubeVideoId` and `videoId` references
   - Reduces database size and leverages external video infrastructure

3. **Single Tenant**
   - No multi-organization support needed for initial launch
   - Simplifies schema without tenant isolation complexity

4. **Confidence Rating as Separate Model**
   - Allows tracking multiple ratings over time per lesson
   - Supports analytics on learning confidence trends
   - Decoupled from conversation flow

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PHASE 1: Core Learning                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   User ─────┬──────────────> LearningProfile (1:1)                         │
│      │      │                                                               │
│      │      ├──────────────> Enrollment ──────────> Course                 │
│      │      │                   (M:N)                  │                    │
│      │      │                                          ▼                    │
│      │      │                                       Module                  │
│      │      │                                          │                    │
│      │      │                                          ▼                    │
│      │      ├──────────────> LessonProgress ──────> Lesson                 │
│      │      │                                                               │
│      │      ├──────────────> ConfidenceRating ─────────┘                   │
│      │      │                                                               │
│      │      └──────────────> MessageFeedback                               │
│      │                                                                      │
└──────┼──────────────────────────────────────────────────────────────────────┘
       │
┌──────┼──────────────────────────────────────────────────────────────────────┐
│      │                  PHASE 2: AI Conversation                            │
├──────┼──────────────────────────────────────────────────────────────────────┤
│      │                                                                      │
│      └──────────────> Thread (1 per user per course)                       │
│                          │                                                  │
│                          ▼                                                  │
│                     Conversation (per lesson/context)                       │
│                          │                                                  │
│                          ▼                                                  │
│                       Message ──────────> MessageFeedback                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Models

### 1. User
Primary user account for authentication and profile.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| email | String | Unique email address |
| phone | String? | Optional unique phone number |
| passwordHash | String | Hashed password |
| name | String | Display name |
| avatar | String? | Profile picture URL |
| lastLoginAt | DateTime? | Last login timestamp |
| createdAt | DateTime | Account creation time |
| updatedAt | DateTime | Last update time |

**Relations**: LearningProfile, Enrollment[], LessonProgress[], Thread[], ConfidenceRating[], MessageFeedback[]

---

### 2. LearningProfile
Stores user's learning preferences for AI personalization.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| userId | String | Foreign key to User (unique) |
| preferredLearningStyle | String | visual, auditory, kinesthetic, mixed |
| learningPace | String | slow, moderate, fast |
| interests | String[] | Topics of interest |
| strengths | String[] | Strong areas |
| improvementAreas | String[] | Areas needing work |

**Why?** AI uses this to personalize explanations, pacing, and content suggestions.

---

### 3. Course
Top-level course container.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| title | String | Course name |
| description | String? | Course overview |
| thumbnail | String? | Cover image URL |
| difficulty | String | beginner, intermediate, advanced |
| estimatedDuration | Int | Total duration in minutes |
| learningObjectives | String[] | What students will learn |
| isPublished | Boolean | Visibility flag |

**Relations**: Module[], Enrollment[], Thread[]

---

### 4. Module
Sections within a course (e.g., "Datasets", "Flowcharts").

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| courseId | String | Foreign key to Course |
| title | String | Module name |
| description | String? | Module overview |
| orderIndex | Int | Display order (0-based) |

**Relations**: Lesson[]

---

### 5. Lesson
Individual learning units (video lectures, quizzes, flashcards).

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| moduleId | String | Foreign key to Module |
| title | String | Lesson name |
| description | String? | Lesson overview |
| type | String | lecture, quiz, flashcards |
| orderIndex | Int | Display order (0-based) |
| kpointVideoId | String? | External video ID (KPOINT) |
| youtubeVideoId | String? | External video ID (YouTube) |
| videoId | String? | Unified video ID for API calls |
| duration | Int | Video length in seconds |

**Relations**: LessonProgress[], Conversation[], ConfidenceRating[]

---

### 6. Enrollment
Many-to-many relationship between User and Course.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| userId | String | Foreign key to User |
| courseId | String | Foreign key to Course |
| enrolledAt | DateTime | Enrollment timestamp |
| status | String | active, completed, paused |

**Constraints**: Unique on [userId, courseId] - user can only enroll once per course.

---

### 7. LessonProgress
Tracks user's progress through each lesson.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| userId | String | Foreign key to User |
| lessonId | String | Foreign key to Lesson |
| status | String | not_started, in_progress, seen, attempted, completed |
| watchTime | Int | Seconds watched |
| completionPercentage | Float | 0-100 progress |
| lastPosition | Int | Resume position in seconds |
| lastAccessedAt | DateTime | Last viewed timestamp |
| completedAt | DateTime? | Completion timestamp |

**Constraints**: Unique on [userId, lessonId]

**Status meanings**:
- `not_started`: Never opened
- `in_progress`: Currently watching (yellow indicator)
- `seen`: Viewed but not completed (blue indicator)
- `attempted`: Quiz attempted but not passed
- `completed`: Fully completed (green indicator)

---

### 8. Thread
One conversation thread per user per course. Contains full learning journey.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| userId | String | Foreign key to User |
| courseId | String | Foreign key to Course |
| createdAt | DateTime | Thread creation time |
| updatedAt | DateTime | Last activity time |

**Constraints**: Unique on [userId, courseId]

**Why Thread?**
- AI can access entire course conversation history for context
- Enables "What did we discuss in Lesson 1?" queries
- Single entry point for all course-related conversations

---

### 9. Conversation
Segment within a Thread, grouped by lesson or context type.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| threadId | String | Foreign key to Thread |
| lessonId | String? | Optional foreign key to Lesson |
| contextType | String | warmup, in_lesson, concept_completion, hint_request, general |
| currentTopic | String? | Current discussion topic |
| summary | String? | AI-generated summary when conversation ends |
| status | String | active, completed |

**Context types**:
- `warmup`: Pre-lesson retrieval practice questions
- `in_lesson`: Questions during video playback
- `concept_completion`: Post-concept quiz discussion
- `hint_request`: When user asks for hints
- `general`: General course questions

**Why Summary?**
Instead of sending 100+ messages to LLM, we send:
```
Previous summaries: ["User understood patterns", "Struggled with totals"]
Current conversation: [full messages]
```
Token efficient + maintains context!

---

### 10. Message
Individual chat messages with voice and video context support.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| conversationId | String | Foreign key to Conversation |
| role | String | user, ai |
| content | String | Text content (or voice transcription) |
| inputType | String | text, voice |
| audioUrl | String? | Stored audio file URL |
| audioDuration | Int? | Audio length in seconds |
| videoTimestamp | Int? | Video position when message sent |
| emotions | Json? | Detected emotional context |
| references | Json? | Topic references |
| createdAt | DateTime | Message timestamp |

**Voice support**: For real-time voice conversations via LiveKit
- `inputType`: Identifies if message came from text or voice
- `audioUrl`: Optional stored audio for playback
- `audioDuration`: For UI display

**Video context**: `videoTimestamp` tracks where in the video the user asked a question, enabling AI to reference specific content.

---

### 11. MessageFeedback
User feedback on AI responses (like/dislike with reason).

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| messageId | String | Foreign key to Message (unique) |
| userId | String | Foreign key to User |
| rating | String | like, dislike |
| reason | String? | Optional explanation |
| createdAt | DateTime | Feedback timestamp |

**Why?**
- Improves AI responses over time
- Identifies problematic responses
- Training data for model fine-tuning

---

### 12. ConfidenceRating
User's self-assessed understanding after completing a lesson.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| userId | String | Foreign key to User |
| lessonId | String | Foreign key to Lesson |
| rating | Int | 1-5 scale (emoji: confused to confident) |
| createdAt | DateTime | Rating timestamp |

**Rating scale** (from mockups):
1. Very confused
2. Somewhat confused
3. Neutral
4. Somewhat confident
5. Very confident

**Why separate model?**
- Track confidence changes over time
- Analytics on which lessons cause confusion
- Trigger adaptive revision paths based on low confidence

---

## Key Constraints & Indexes

### Unique Constraints
| Table | Constraint | Purpose |
|-------|------------|---------|
| User | email | One account per email |
| User | phone | One account per phone |
| LearningProfile | userId | One profile per user |
| Enrollment | [userId, courseId] | One enrollment per course |
| LessonProgress | [userId, lessonId] | One progress record per lesson |
| Thread | [userId, courseId] | One thread per course |
| MessageFeedback | messageId | One feedback per message |

### Indexes
All foreign keys are indexed for query performance:
- `Module.courseId`
- `Lesson.moduleId`
- `Enrollment.userId`, `Enrollment.courseId`
- `LessonProgress.userId`, `LessonProgress.lessonId`
- `Thread.userId`, `Thread.courseId`
- `Conversation.threadId`, `Conversation.lessonId`
- `Message.conversationId`
- `MessageFeedback.messageId`, `MessageFeedback.userId`
- `ConfidenceRating.userId`, `ConfidenceRating.lessonId`

---

## Cascade Delete Behavior

| Parent | Child | Behavior |
|--------|-------|----------|
| User | LearningProfile, Enrollment, LessonProgress, Thread, ConfidenceRating, MessageFeedback | CASCADE |
| Course | Module, Enrollment, Thread | CASCADE |
| Module | Lesson | CASCADE |
| Lesson | LessonProgress, ConfidenceRating | CASCADE |
| Lesson | Conversation | SET NULL (preserves conversation history) |
| Thread | Conversation | CASCADE |
| Conversation | Message | CASCADE |
| Message | MessageFeedback | CASCADE |

---

## Usage Examples

### Get user's course progress
```typescript
const progress = await prisma.lessonProgress.findMany({
  where: { userId: user.id },
  include: { lesson: { include: { module: true } } }
});
```

### Get thread with summaries for LLM context
```typescript
const thread = await prisma.thread.findUnique({
  where: { userId_courseId: { userId, courseId } },
  include: {
    conversations: {
      select: { summary: true, contextType: true, lessonId: true },
      where: { status: 'completed' }
    }
  }
});
```

### Get current conversation with messages
```typescript
const conversation = await prisma.conversation.findFirst({
  where: { threadId, status: 'active' },
  include: { messages: { orderBy: { createdAt: 'asc' } } }
});
```

---

## Future Extensions (Phase 3+)

When ready to expand, consider adding:

1. **Assessment System**
   - `Quiz`, `Question`, `QuestionOption`
   - `QuizAttempt`, `QuestionResponse`

2. **Video Features**
   - `VideoHighlight` - Timeline markers
   - `VideoComment` - User comments on videos

3. **Hints System**
   - `Hint` - Scaffolded hints for questions

4. **Analytics**
   - `LearningSession` - Session tracking
   - `EngagementMetric` - Detailed analytics

---

## Schema Location

The Prisma schema is located at: `prisma/schema.prisma`

To apply changes:
```bash
./node_modules/.bin/prisma db push
```

To view data:
```bash
./node_modules/.bin/prisma studio
```
