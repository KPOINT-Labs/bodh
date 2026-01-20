# Course Access Auto-Enrollment Design

**Date:** 2026-01-20
**Status:** Approved
**Author:** Claude Code

## Problem Statement

When a user clicks on a course in CourseBrowser or accesses a course via direct URL, they should be automatically enrolled if not already enrolled. Currently, users must be pre-enrolled (at signup time) to access courses.

## Solution

Silent auto-enrollment when accessing any course page. No modal or confirmation - just enroll and show content.

## Implementation

### 1. New Helper Function

Add to `actions/enrollment.ts`:

```typescript
export async function ensureEnrollment(userId: string, courseId: string): Promise<void> {
  await prisma.enrollment.upsert({
    where: {
      userId_courseId: { userId, courseId }
    },
    create: {
      userId,
      courseId,
      status: "active"
    },
    update: {} // No update needed if exists
  });
}
```

### 2. Integration Point

In `app/(learning)/course/[courseId]/module/[moduleId]/page.tsx`, after data fetch:

```typescript
// After getting module data, before rendering
const data = await getModuleData(courseId, moduleId);
if (!data) {
  notFound();
}

// Auto-enroll if not enrolled
await ensureEnrollment(session.user.id, data.course.id);

// Continue with render...
```

## Why This Approach

- **Single query**: `upsert` is atomic - creates if missing, no-op if exists
- **No race conditions**: Database handles concurrent access safely
- **Covers all entry points**: Works for CourseBrowser clicks AND direct URL access
- **Silent UX**: No interruption to user flow
- **Minimal code**: ~10 lines total

## Files Modified

- `actions/enrollment.ts` - Add `ensureEnrollment()` function
- `app/(learning)/course/[courseId]/module/[moduleId]/page.tsx` - Add enrollment check

## Testing

- Access course when not enrolled → should auto-enroll and show content
- Access course when already enrolled → should work normally (no duplicate)
- Check database → enrollment record created with status "active"
