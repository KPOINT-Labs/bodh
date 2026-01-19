# Lesson Progress Tracking Design

**Date:** 2026-01-19
**Status:** Design Complete
**Author:** System Design

## Problem Statement

Currently, the application tracks video watch events but does not update the `LessonProgress` table in the database. This causes courses to show "Yet to start" status even after users have watched videos. The course status calculation depends on lesson progress data, which is not being populated.

## Requirements

### Functional Requirements
1. Track video watch progress automatically during playback
2. Update progress every 15 seconds while video is playing
3. Save progress on pause, video end, and page exit events
4. Mark lessons as "completed" when 90%+ watched OR video END state reached
5. Resume videos from last watched position for in-progress lessons
6. Use simple status transitions: `not_started` → `in_progress` → `completed`

### Non-Functional Requirements
- Silent failure on update errors (log but don't disrupt user)
- No offline queuing or retry logic (keep it simple)
- Minimal impact on video playback performance
- Work with existing KPoint video player integration

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────┐
│ ModuleContent.tsx                                    │
│ - Fetches lesson progress on lesson load            │
│ - Passes userId, lessonId, duration to hook         │
│ - Calculates effective start offset for resume      │
└─────────────┬───────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────┐
│ useKPointPlayer (hooks/useKPointPlayer.ts)          │
│ - Listens to timeUpdate events                      │
│ - Tracks last update timestamp                      │
│ - Updates progress every 15 seconds                 │
│ - Updates on pause/end state changes                │
└─────────────┬───────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────┐
│ Server Actions (lib/actions/lesson-progress.ts)     │
│ - updateLessonProgress(): Upsert progress           │
│ - getLessonProgress(): Fetch for resume             │
└─────────────┬───────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────┐
│ Database (LessonProgress table)                     │
│ - Stores status, lastPosition, completionPercentage │
│ - Unique constraint on (userId, lessonId)           │
└─────────────────────────────────────────────────────┘
```

### Data Flow

1. **Video Playing**
   - KPoint player fires `timeUpdate` events continuously
   - Hook tracks elapsed time since last update
   - Every 15 seconds: Call `updateLessonProgress()` server action

2. **Progress Update**
   ```typescript
   updateLessonProgress({
     userId,
     lessonId,
     lastPosition: currentTimeInSeconds,
     completionPercentage: (currentTime/duration) * 100,
     videoEnded: false
   })
   ```

3. **State Changes (Pause/End)**
   - On PAUSED: Save current progress immediately
   - On ENDED: Save with `videoEnded: true` flag
   - Server action marks as "completed" if 90%+ or videoEnded

4. **Resume on Load**
   - Fetch lesson progress when lesson is selected
   - If status is "in_progress", use `lastPosition` as start offset
   - Pass to video player for automatic seek

## Implementation Details

### 1. Server Actions (`lib/actions/lesson-progress.ts`)

```typescript
"use server"

import { prisma } from "@/lib/prisma";

export async function updateLessonProgress({
  userId,
  lessonId,
  lastPosition,        // in seconds
  completionPercentage, // 0-100
  videoEnded = false,  // true when video END event fires
}: {
  userId: string;
  lessonId: string;
  lastPosition: number;
  completionPercentage: number;
  videoEnded?: boolean;
}) {
  // Calculate status based on completion
  let status = "in_progress";
  let completedAt = null;

  if (videoEnded || completionPercentage >= 90) {
    status = "completed";
    completedAt = new Date();
  }

  // Upsert progress (create or update)
  await prisma.lessonProgress.upsert({
    where: {
      userId_lessonId: { userId, lessonId }
    },
    update: {
      status,
      lastPosition,
      completionPercentage,
      lastAccessedAt: new Date(),
      ...(completedAt && { completedAt }),
    },
    create: {
      userId,
      lessonId,
      status,
      lastPosition,
      completionPercentage,
      lastAccessedAt: new Date(),
      completedAt,
    },
  });
}

export async function getLessonProgress(userId: string, lessonId: string) {
  const progress = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
    select: { lastPosition: true, status: true },
  });

  return progress;
}
```

### 2. Video Player Hook Updates (`hooks/useKPointPlayer.ts`)

**New Parameters:**
```typescript
interface UseKPointPlayerOptions {
  kpointVideoId: string | null | undefined;
  userId?: string;           // NEW
  lessonId?: string;         // NEW
  videoDuration?: number;    // NEW - in seconds
  onBookmarksReady?: (bookmarks: Bookmark[]) => void;
  onPlayerReady?: () => void;
  onFATrigger?: (...) => Promise<void>;
  onVideoEnd?: () => void;
}
```

**Progress Tracking State:**
```typescript
const lastProgressUpdateRef = useRef<number>(0);
const PROGRESS_UPDATE_INTERVAL = 15000; // 15 seconds
```

**Modified `handlePlayerTimeUpdate`:**
```typescript
const handlePlayerTimeUpdate = () => {
  if (!playerRef.current) return;

  const currentTimeMs = playerRef.current.getCurrentTime();
  const currentTimeSec = currentTimeMs / 1000;

  // Existing: FA triggers
  const currentBookmarks = bookmarksRef.current;
  const currentIsPlaying = isPlayingRef.current;
  if (currentBookmarks.length > 0 && currentIsPlaying) {
    checkForFATriggersInternal(currentTimeMs, currentBookmarks);
  }

  // NEW: Progress tracking
  if (userId && lessonId && videoDuration && currentIsPlaying) {
    const now = Date.now();
    if (now - lastProgressUpdateRef.current >= PROGRESS_UPDATE_INTERVAL) {
      lastProgressUpdateRef.current = now;
      updateProgress(currentTimeSec, false);
    }
  }
};
```

**Progress Update Helper:**
```typescript
const updateProgress = async (currentTimeSec: number, videoEnded: boolean) => {
  if (!userId || !lessonId || !videoDuration) return;

  const completionPercentage = Math.min((currentTimeSec / videoDuration) * 100, 100);

  try {
    await updateLessonProgress({
      userId,
      lessonId,
      lastPosition: Math.floor(currentTimeSec),
      completionPercentage: Math.round(completionPercentage),
      videoEnded,
    });
  } catch (error) {
    console.error("Failed to update lesson progress:", error);
    // Silent failure - don't disrupt user experience
  }
};
```

**Modified `handlePlayerStateChange`:**
```typescript
const handlePlayerStateChange = (event: unknown) => {
  const eventObj = event as { data: number };
  const stateValue = eventObj.data;
  const nowPlaying = stateValue === PLAYER_STATE.PLAYING;
  setIsPlaying(nowPlaying);

  // NEW: Save progress on pause
  if (stateValue === PLAYER_STATE.PAUSED && playerRef.current) {
    const currentTimeSec = playerRef.current.getCurrentTime() / 1000;
    updateProgress(currentTimeSec, false);
  }

  // Modified: Save progress on end with videoEnded flag
  if (stateValue === PLAYER_STATE.ENDED) {
    if (playerRef.current) {
      const currentTimeSec = playerRef.current.getCurrentTime() / 1000;
      updateProgress(currentTimeSec, true); // Mark as ended
    }
    onVideoEndRef.current?.();
  }
};
```

### 3. Resume Functionality (`ModuleContent.tsx`)

**Fetch Progress State:**
```typescript
const [lessonProgress, setLessonProgress] = useState<{
  lastPosition: number;
  status: string;
} | null>(null);

useEffect(() => {
  if (!selectedLesson || !userId) return;

  async function fetchProgress() {
    try {
      const progress = await getLessonProgress(userId, selectedLesson!.id);
      setLessonProgress(progress);
    } catch (error) {
      console.error("Failed to fetch lesson progress:", error);
      setLessonProgress(null);
    }
  }

  fetchProgress();
}, [selectedLesson?.id, userId]);
```

**Pass to Video Player:**
```typescript
// Get video duration from lesson (already in schema)
const videoDuration = selectedLesson?.duration || 0;

// Calculate effective start offset (manual timestamp OR saved position)
const effectiveStartOffset = videoStartOffset ??
  (lessonProgress?.status === "in_progress" ? lessonProgress.lastPosition : null);

// Pass to hook
const { seekTo, getCurrentTime, isPlayerReady, isPlaying, playerRef } = useKPointPlayer({
  kpointVideoId: selectedLesson?.kpointVideoId,
  userId,
  lessonId: selectedLesson?.id,
  videoDuration,
  onVideoEnd: handleVideoEnd,
  onFATrigger: async (...) => { ... },
});

// Pass to player component
<KPointVideoPlayer
  kpointVideoId={selectedLesson.kpointVideoId}
  startOffset={effectiveStartOffset}
/>
```

## Database Schema

The existing `LessonProgress` model already has all required fields:

```prisma
model LessonProgress {
  id                   String    @id @default(cuid())
  userId               String
  lessonId             String
  status               String    @default("not_started")
  watchTime            Int       @default(0)           // NOT USED for now
  completionPercentage Float     @default(0)           // USED: 0-100
  lastPosition         Int       @default(0)           // USED: seconds
  lastAccessedAt       DateTime  @default(now())       // USED: updated on each save
  completedAt          DateTime?                       // USED: set when completed
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  lesson               Lesson    @relation(...)
  user                 User      @relation(...)

  @@unique([userId, lessonId])
  @@index([userId])
  @@index([lessonId])
}
```

**Fields Used:**
- `status`: "not_started" | "in_progress" | "completed"
- `lastPosition`: Current playback position in seconds (for resume)
- `completionPercentage`: 0-100 (for completion logic)
- `lastAccessedAt`: Updated on every progress save
- `completedAt`: Set when lesson reaches completed status

**Fields NOT Used (for now):**
- `watchTime`: Could track accumulated watch time, but not needed for MVP

## Status Transitions

```
not_started
    │
    │ (video starts playing)
    │
    ▼
in_progress
    │
    │ (90%+ watched OR video END event)
    │
    ▼
completed (sets completedAt timestamp)
```

**Rules:**
- Once "completed", status doesn't change back (no downgrade)
- "in_progress" can update position/percentage multiple times
- Resume only applies to "in_progress" lessons

## Error Handling

### Silent Failure Strategy
- Progress update failures are logged but don't disrupt user
- No toast notifications or error UI
- Rationale: Multiple save points (every 15s + pause/end/exit) make individual failures non-critical

### Edge Cases
1. **Video duration is 0 or missing**: Don't track progress (skip updates)
2. **User navigates away mid-video**: Browser unload events not guaranteed, rely on periodic saves
3. **Network failure during update**: Silent log, next update point will retry
4. **Lesson already completed**: Don't downgrade status, but still update lastAccessedAt

## Testing Considerations

### Manual Testing Scenarios
1. **Basic Progress**: Watch 20 seconds → verify DB shows lastPosition=20, status="in_progress"
2. **Completion**: Watch to 90% → verify status="completed", completedAt is set
3. **Video End**: Watch to end (regardless of %) → verify status="completed"
4. **Resume**: Start lesson with in_progress status → verify video seeks to lastPosition
5. **Pause**: Pause video → verify progress saved immediately
6. **Course Status**: Complete a lesson → verify course shows "in_progress" in sidebar

### Database Verification
```sql
-- Check progress for a user
SELECT * FROM "LessonProgress" WHERE "userId" = 'user_id_here';

-- Verify course status calculation works
-- (existing API endpoint already handles this)
```

## Open Questions / Future Enhancements

### Not Implementing Now (YAGNI)
- ❌ Retry logic with exponential backoff (over-engineering)
- ❌ Offline progress queuing (adds complexity, unclear benefit)
- ❌ User confirmation for resume ("Resume from X:XX?" prompt)
- ❌ Watch time tracking (not needed for completion logic)
- ❌ Analytics events for progress milestones
- ❌ Progress sync across multiple devices/tabs

### Could Add Later If Needed
- "Seen" status for lessons watched but not completed
- Re-watch functionality (allow going back to in_progress from completed)
- Progress bar UI showing completion percentage
- "Mark as complete" manual button for non-video lessons

## Implementation Checklist

- [ ] Create `lib/actions/lesson-progress.ts` with server actions
- [ ] Update `hooks/useKPointPlayer.ts`:
  - [ ] Add userId, lessonId, videoDuration parameters
  - [ ] Add progress tracking to timeUpdate handler
  - [ ] Add progress save to state change handler (pause/end)
  - [ ] Import and call server action
- [ ] Update `ModuleContent.tsx`:
  - [ ] Add lessonProgress state
  - [ ] Fetch progress on lesson load
  - [ ] Calculate effective start offset for resume
  - [ ] Pass new params to useKPointPlayer
- [ ] Test basic progress tracking
- [ ] Test completion logic (90% + video end)
- [ ] Test resume functionality
- [ ] Verify course status updates in sidebar

## Success Criteria

✅ Videos update `LessonProgress` table every 15 seconds
✅ Progress saved on pause/end/exit events
✅ Lessons marked "completed" at 90%+ or video END
✅ Courses show "in_progress" status after watching videos
✅ Videos resume from last watched position
✅ No disruption to user experience on progress update failures
