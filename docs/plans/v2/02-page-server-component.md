# V2 Page Server Component

## Overview

Server component responsible for:
1. Authentication check
2. Data fetching (course, module, lessons)
3. Auto-enrollment
4. LiveKit token generation
5. Pass data to client component

## File: `app/(learning)/v2/course/[courseId]/module/[moduleId]/page.tsx`

```typescript
import { notFound, redirect } from "next/navigation";
import { ensureEnrollment } from "@/actions/enrollment";
import { auth } from "@/auth";
import { getLiveKitToken } from "@/actions/livekit";
import { getSessionType } from "@/actions/session-type";
import { prisma } from "@/lib/prisma";
import { ModuleView } from "./ModuleView";

export const dynamic = "force-dynamic";

interface ModulePageProps {
  params: Promise<{ courseId: string; moduleId: string }>;
  searchParams: Promise<{ lesson?: string }>;
}

async function getModuleData(courseIdOrSlug: string, moduleId: string) {
  // Find course by course_id, id, or slug
  const course = await prisma.course.findFirst({
    where: {
      OR: [
        { course_id: courseIdOrSlug },
        { id: courseIdOrSlug },
        { slug: courseIdOrSlug },
      ],
    },
    select: {
      id: true,
      title: true,
      description: true,
      learningObjectives: true,
    },
  });

  if (!course) return null;

  const module = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      lessons: {
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          title: true,
          orderIndex: true,
          kpointVideoId: true,
          youtubeVideoId: true,
          description: true,
          duration: true,
          quiz: true,
        },
      },
    },
  });

  if (!module || module.courseId !== course.id) return null;

  return { course, module };
}

export default async function ModulePageV2({ params, searchParams }: ModulePageProps) {
  const { courseId, moduleId } = await params;
  const { lesson: lessonIdFromUrl } = await searchParams;

  // 1. Auth check
  const session = await auth();
  if (!session?.user?.id) {
    notFound();
  }

  // 2. Fetch data
  const data = await getModuleData(courseId, moduleId);
  if (!data) {
    notFound();
  }

  const { course, module } = data;

  // 3. Auto-enroll
  await ensureEnrollment(session.user.id, course.id);

  // 4. Determine initial lesson and session type
  const initialLesson = lessonIdFromUrl
    ? module.lessons.find((l) => l.id === lessonIdFromUrl) || module.lessons[0]
    : module.lessons[0];

  // Get session type from DB (course_welcome, course_welcome_back, lesson_welcome, lesson_welcome_back)
  const sessionTypeData = await getSessionType({
    userId: session.user.id,
    courseId: course.id,
    lessonId: initialLesson?.id,
  });

  // 5. Generate LiveKit token with full metadata
  const roomName = `${course.id}-${module.id}`;
  
  const liveKitToken = await getLiveKitToken({
    roomName,
    participantName: session.user.id,
    metadata: {
      agent_type: "bodh-agent",
      courseId: course.id,
      courseTitle: course.title,
      moduleId: module.id,
      moduleTitle: module.title,
      lessonId: initialLesson?.id,
      lessonTitle: initialLesson?.title,
      lessonNumber: sessionTypeData.lessonNumber,
      videoIds: initialLesson?.kpointVideoId ? [initialLesson.kpointVideoId] : [],
      learningObjectives: course.learningObjectives,
      userId: session.user.id,
      userName: session.user.name,
      sessionType: sessionTypeData.sessionType,
      isFirstCourseVisit: sessionTypeData.isFirstCourseVisit,
      isIntroLesson: sessionTypeData.isIntroLesson,
      prevLessonTitle: sessionTypeData.prevLessonTitle,
    },
  });

  // 6. Redirect to error page if token generation failed
  if (!liveKitToken) {
    redirect("/error?reason=livekit_token_failed");
  }

  // 7. Pass to client component
  return (
    <ModuleView
      course={course}
      module={module}
      userId={session.user.id}
      userName={session.user.name || "User"}
      roomName={roomName}
      liveKitToken={liveKitToken}
      sessionType={sessionTypeData}
    />
  );
}
```

## Server Action: `actions/livekit.ts`

```typescript
"use server";

import { AccessToken, type VideoGrant } from "livekit-server-sdk";
import { roomService, getLiveKitCredentials } from "@/lib/livekit";

interface RoomMetadata {
  courseId?: string;
  courseTitle?: string;
  moduleId?: string;
  moduleTitle?: string;
  lessonId?: string;
  lessonTitle?: string;
  videoIds?: string[];
  learningObjectives?: string[];
  userId?: string;
  userName?: string;
  sessionType?: string;
  [key: string]: unknown;
}

interface GetLiveKitTokenParams {
  roomName: string;
  participantName: string;
  metadata?: RoomMetadata;
}

export async function getLiveKitToken({
  roomName,
  participantName,
  metadata = {},
}: GetLiveKitTokenParams): Promise<string | null> {
  try {
    const { apiKey, apiSecret, url } = getLiveKitCredentials();

    // Create or update room with metadata
    try {
      await roomService.createRoom({
        name: roomName,
        metadata: JSON.stringify(metadata),
        emptyTimeout: 600,
      });
    } catch {
      // Room exists - update metadata
      await roomService.updateRoomMetadata(roomName, JSON.stringify(metadata));
    }

    // Create access token
    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      name: participantName,
      metadata: JSON.stringify(metadata),
    });

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    } as VideoGrant);

    return await token.toJwt();
  } catch (error) {
    console.error("[getLiveKitToken] Error:", error);
    return null;
  }
}

export async function updateRoomMetadata(
  roomName: string,
  metadata: RoomMetadata
): Promise<void> {
  try {
    await roomService.updateRoomMetadata(roomName, JSON.stringify(metadata));
  } catch (error) {
    console.error("[updateRoomMetadata] Error:", error);
  }
}
```

## Server Action: `actions/session-type.ts`

```typescript
"use server";

import { prisma } from "@/lib/prisma";

export type SessionType =
  | "course_welcome"
  | "course_welcome_back"
  | "lesson_welcome"
  | "lesson_welcome_back";

interface SessionTypeResult {
  sessionType: SessionType;
  isFirstCourseVisit: boolean;
  isIntroLesson: boolean;
  isFirstLessonVisit: boolean;
  lessonNumber: number;
  prevLessonTitle: string | null;
  courseProgress: {
    completedLessons: number;
    totalLessons: number;
    lastLessonTitle: string | null;
  };
  lessonProgress: {
    completionPercentage: number;
    lastPosition: number;
    status: string;
  } | null;
}

interface GetSessionTypeParams {
  userId: string;
  courseId: string;
  lessonId?: string;
}

export async function getSessionType({
  userId,
  courseId,
  lessonId,
}: GetSessionTypeParams): Promise<SessionTypeResult> {
  // 1. Check if first course visit (no lesson progress exists)
  const existingProgressCount = await prisma.lessonProgress.count({
    where: { userId, lesson: { courseId } },
  });
  const isFirstCourseVisit = existingProgressCount === 0;

  // 2. Get course progress
  const [totalLessons, completedLessons, lastAccessedProgress] = await Promise.all([
    prisma.lesson.count({ where: { courseId, isPublished: true } }),
    prisma.lessonProgress.count({
      where: { userId, lesson: { courseId }, status: "completed" },
    }),
    prisma.lessonProgress.findFirst({
      where: { userId, lesson: { courseId } },
      include: { lesson: { select: { title: true } } },
      orderBy: { lastAccessedAt: "desc" },
    }),
  ]);

  // 3. Determine if current lesson is intro lesson
  let isIntroLesson = false;
  let isFirstLessonVisit = true;
  let lessonNumber = 1;
  let prevLessonTitle: string | null = null;
  let lessonProgress = null;

  if (lessonId) {
    const [currentLesson, firstModule, allLessons, existingProgress] = await Promise.all([
      prisma.lesson.findUnique({
        where: { id: lessonId },
        select: { id: true, orderIndex: true, moduleId: true },
      }),
      prisma.module.findFirst({
        where: { courseId, isPublished: true },
        orderBy: { orderIndex: "asc" },
        select: { id: true },
      }),
      prisma.lesson.findMany({
        where: { courseId, isPublished: true },
        include: { module: { select: { orderIndex: true } } },
        orderBy: [{ module: { orderIndex: "asc" } }, { orderIndex: "asc" }],
      }),
      prisma.lessonProgress.findUnique({
        where: { userId_lessonId: { userId, lessonId } },
      }),
    ]);

    if (currentLesson && firstModule) {
      isIntroLesson = currentLesson.orderIndex === 0 && currentLesson.moduleId === firstModule.id;
    }

    // Find global lesson position
    const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
    lessonNumber = currentIndex >= 0 ? currentIndex + 1 : 1;
    if (currentIndex > 0) {
      prevLessonTitle = allLessons[currentIndex - 1].title;
    }

    isFirstLessonVisit = !existingProgress || existingProgress.status === "not_started";
    
    if (existingProgress) {
      lessonProgress = {
        completionPercentage: existingProgress.completionPercentage,
        lastPosition: existingProgress.lastPosition,
        status: existingProgress.status,
      };
    }
  }

  // 4. Determine session type
  let sessionType: SessionType;
  if (isIntroLesson) {
    sessionType = isFirstCourseVisit ? "course_welcome" : "course_welcome_back";
  } else {
    sessionType = isFirstLessonVisit ? "lesson_welcome" : "lesson_welcome_back";
  }

  return {
    sessionType,
    isFirstCourseVisit,
    isIntroLesson,
    isFirstLessonVisit,
    lessonNumber,
    prevLessonTitle,
    courseProgress: {
      completedLessons,
      totalLessons,
      lastLessonTitle: lastAccessedProgress?.lesson?.title || null,
    },
    lessonProgress,
  };
}
```

## Props Passed to ModuleView

| Prop | Type | Source |
|------|------|--------|
| `course` | `{ id, title, description, learningObjectives }` | Prisma |
| `module` | `{ id, title, lessons[] }` | Prisma |
| `userId` | `string` | Auth session |
| `userName` | `string` | Auth session |
| `roomName` | `string` | Generated: `${courseId}-${moduleId}` |
| `liveKitToken` | `string` | Server action (redirects if null) |

## What's NOT Passed (Handled by nuqs)

| State | Handled By |
|-------|------------|
| `selectedLessonId` | nuqs `?lesson=xxx` → `useLearningPanel()` |
| `isRightPanelOpen` | nuqs `?panel=true` → `useLearningPanel()` |

## Key Decisions

### 1. Token generated server-side
- **Why**: Faster initial load, no loading state for token
- **Initial lesson**: Read from `?lesson=xxx` URL param, fallback to first lesson
- **Subsequent changes**: Update metadata client-side via LiveKit SDK when lesson changes

### 2. Lessons sorted at DB level
- **Why**: `orderBy: { orderIndex: "asc" }` in Prisma query
- **Benefit**: No client-side sorting needed

### 3. searchParams read server-side for initial token only
- **Why**: Agent needs correct lesson context on first connect
- **Server reads**: `?lesson=xxx` for initial LiveKit metadata
- **Client reads**: nuqs handles ongoing URL state changes

### 4. Room name format
- **Format**: `${courseId}-${moduleId}`
- **Why**: One room per module (not per lesson)
- **Agent**: Reads `room.metadata` to know current lesson context

## Error Handling

| Scenario | Action |
|----------|--------|
| Not authenticated | `notFound()` → 404 page |
| Course not found | `notFound()` → 404 page |
| Module not found | `notFound()` → 404 page |
| Module not in course | `notFound()` → 404 page |
| LiveKit token fails | `redirect("/error?reason=livekit_token_failed")` |

## Comparison with V1

| Aspect | V1 | V2 |
|--------|----|----|
| Token fetch | `useEffect` + `/api/livekit/token` | Server action in page.tsx |
| Initial state | Props: `initialLessonId`, `initialPanelOpen` | nuqs reads URL directly |
| Data fetching | Same | Same |
| Auth check | Same | Same |
| Auto-enroll | Same | Same |
