# Auto-Enrollment Design

**Date:** 2026-01-19
**Status:** Implemented ✅
**Implemented:** 2026-01-19
**Author:** Claude Code

## Problem Statement

Currently, new users who sign up (via credentials or Google OAuth) are created in the database but have no course enrollments. Since there's no UI for course enrollment yet, users cannot access any course content. The solution is to automatically enroll new users in all published courses at signup time.

## Goals

1. Auto-enroll new users in all published courses immediately upon account creation
2. Handle both credentials signup and Google OAuth first-time sign-in
3. Backfill enrollments for existing users who have none
4. Ensure enrollment failures don't block user creation or sign-in

## Architecture Overview

### Core Approach

Auto-enrollment will happen at the point of user creation, which occurs in two places:

1. **Credentials signup**: In `actions/auth.ts`, the `signup()` function creates users (line 86-92)
2. **Google OAuth signup**: In `auth.ts`, the `signIn` callback upserts users for first-time Google sign-ins (line 68-93)

The enrollment logic will be centralized in a reusable helper function that:
- Fetches all published courses (`isPublished = true`)
- Creates enrollment records with `status = "active"`
- Uses Prisma's `createMany` with `skipDuplicates` to handle race conditions safely

### Data Model

No schema changes required. The existing `Enrollment` model already has:
- `@@unique([userId, courseId])` constraint preventing duplicate enrollments
- `status` field (we'll set to "active")
- `enrolledAt` timestamp (auto-populated with `@default(now())`)

## Implementation Details

### 1. Helper Function: `autoEnrollNewUser()`

Create new file: `actions/enrollment.ts`

```typescript
"use server";

import { prisma } from "@/lib/prisma";

/**
 * Auto-enrolls a new user in all published courses
 * @param userId - The user ID to enroll
 * @returns Promise<void>
 */
export async function autoEnrollNewUser(userId: string): Promise<void> {
  try {
    // Get all published courses
    const publishedCourses = await prisma.course.findMany({
      where: { isPublished: true },
      select: { id: true }
    });

    // If no published courses, nothing to do
    if (publishedCourses.length === 0) {
      console.log(`[AutoEnroll] No published courses available for user ${userId}`);
      return;
    }

    // Prepare enrollment data
    const enrollmentData = publishedCourses.map(course => ({
      userId,
      courseId: course.id,
      status: "active" as const
    }));

    // Bulk create enrollments
    const result = await prisma.enrollment.createMany({
      data: enrollmentData,
      skipDuplicates: true
    });

    console.log(`[AutoEnroll] Enrolled user ${userId} in ${result.count} courses`);
  } catch (error) {
    console.error(`[AutoEnroll] Failed for user ${userId}:`, error);
    // Don't throw - enrollment failure shouldn't block user creation
  }
}
```

### 2. Integration Point: Credentials Signup

In `actions/auth.ts`, modify the `signup()` function:

```typescript
// After user creation (line 86-92)
const createdUser = await prisma.user.create({
  data: {
    name,
    email,
    passwordHash,
  },
});

// Auto-enroll in published courses
await autoEnrollNewUser(createdUser.id);

return { success: true };
```

### 3. Integration Point: Google OAuth Signup

In `auth.ts`, modify the `signIn` callback:

```typescript
async signIn({ user, account, profile }) {
  if (account?.provider === "google") {
    // Upsert user
    const dbUser = await prisma.user.upsert({
      where: { email: user.email! },
      update: { lastLoginAt: new Date() },
      create: {
        email: user.email!,
        name: user.name ?? "",
        image: user.image,
      },
    });

    // Check if user has any enrollments (indicates existing user)
    const enrollmentCount = await prisma.enrollment.count({
      where: { userId: dbUser.id }
    });

    // Auto-enroll only if new user (no enrollments)
    if (enrollmentCount === 0) {
      await autoEnrollNewUser(dbUser.id);
    }
  }

  return true;
}
```

## Edge Cases & Error Handling

### No Published Courses
- If query returns empty array, `createMany` is called with empty data
- This is safe and succeeds without creating enrollments
- User signs up successfully with zero enrollments

### Race Conditions
- Multiple concurrent signups/sign-ins for same user (edge case with OAuth)
- `skipDuplicates: true` prevents unique constraint violations
- Postgres `@@unique([userId, courseId])` constraint provides database-level safety

### Existing Users (Google OAuth)
- Check enrollment count to detect new vs. returning users
- Only auto-enroll if `enrollmentCount === 0`
- Handles edge case where user somehow has zero enrollments

### Error Handling Strategy
- Auto-enrollment failures should NOT block user creation or sign-in
- Use try-catch in `autoEnrollNewUser()`
- Log errors with context (userId, error message) for debugging
- Users can still sign in successfully even if auto-enrollment fails

### Logging & Observability
- Success: `[AutoEnroll] Enrolled user ${userId} in ${count} courses`
- Failure: `[AutoEnroll] Failed for user ${userId}:` + error details
- No courses: `[AutoEnroll] No published courses available for user ${userId}`

## Migration Script for Existing Users

Create `scripts/backfill-enrollments.ts` to enroll existing users:

```typescript
import { prisma } from "@/lib/prisma";

async function backfillEnrollments() {
  const dryRun = process.argv.includes("--dry-run");

  console.log(`\n🔍 Finding users without enrollments...`);

  // Find users with no enrollments
  const usersWithoutEnrollments = await prisma.user.findMany({
    where: {
      enrollments: { none: {} }
    },
    select: { id: true, email: true, name: true }
  });

  console.log(`Found ${usersWithoutEnrollments.length} users without enrollments\n`);

  // Get all published courses
  const publishedCourses = await prisma.course.findMany({
    where: { isPublished: true },
    select: { id: true, title: true }
  });

  console.log(`Found ${publishedCourses.length} published courses\n`);

  if (publishedCourses.length === 0) {
    console.log("⚠️  No published courses to enroll users in. Exiting.");
    return;
  }

  let totalEnrollments = 0;

  // For each user, create enrollments
  for (const user of usersWithoutEnrollments) {
    const enrollmentData = publishedCourses.map(course => ({
      userId: user.id,
      courseId: course.id,
      status: "active" as const
    }));

    if (dryRun) {
      console.log(`[DRY RUN] Would enroll ${user.email} in ${publishedCourses.length} courses`);
      totalEnrollments += publishedCourses.length;
    } else {
      const result = await prisma.enrollment.createMany({
        data: enrollmentData,
        skipDuplicates: true
      });

      console.log(`✅ Enrolled ${user.email} in ${result.count} courses`);
      totalEnrollments += result.count;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Users processed: ${usersWithoutEnrollments.length}`);
  console.log(`   Total enrollments ${dryRun ? "would be" : ""} created: ${totalEnrollments}`);

  if (dryRun) {
    console.log(`\n💡 Run without --dry-run to apply changes`);
  }
}

backfillEnrollments()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
```

**Usage:**
```bash
# Preview changes
bun run scripts/backfill-enrollments.ts --dry-run

# Apply changes
bun run scripts/backfill-enrollments.ts
```

## Testing Strategy

### New User Testing
- **Credentials signup**: Create new account via signup form, verify enrollments created
- **Google OAuth first-time**: Sign in with new Google account, verify enrollments created
- **No published courses**: Temporarily unpublish all courses, sign up, verify no errors
- **Multiple courses**: Ensure all published courses are enrolled, check enrollment count matches

### Existing User Testing
- **Google OAuth returning user**: Sign in multiple times, verify no duplicate enrollments
- **Manual verification**: Check database `Enrollment` table for correct records

### Error Scenarios
- Database connection failure during enrollment (verify user creation still succeeds)
- Invalid course data (malformed courseId, verify graceful failure)

## Rollout Plan

1. **Implement auto-enrollment logic** in `actions/enrollment.ts`
2. **Integrate into auth flows** (credentials + OAuth in `actions/auth.ts` and `auth.ts`)
3. **Test with new test account** to verify auto-enrollment works
4. **Run migration script** with `--dry-run` to preview changes
5. **Run migration script** without dry-run to backfill existing users
6. **Verify in database** that all users have enrollments
7. **Monitor logs** for any auto-enrollment failures in production

## Rollback Strategy

If issues arise:
- Delete all enrollments created after a certain timestamp
- Add feature flag to disable auto-enrollment temporarily
- Migration script is idempotent, can re-run safely with `skipDuplicates: true`

## Future Considerations

- **Manual enrollment UI**: When built, should check for existing enrollments before creating
- **Course visibility settings**: May want to add additional filters beyond `isPublished`
- **Enrollment limits**: If courses have capacity limits, need to check before auto-enrolling
- **Selective enrollment**: May want to enroll based on user role, organization, or preferences
- **Unenrollment logic**: Consider adding functionality to unenroll from specific courses

## Files Modified

- `actions/enrollment.ts` (new) - Auto-enrollment helper function
- `actions/auth.ts` - Credentials signup integration
- `auth.ts` - Google OAuth integration
- `scripts/backfill-enrollments.ts` (new) - Migration script

## Success Metrics

- All new users have enrollments immediately after signup
- No signup/sign-in failures due to enrollment logic
- All existing users backfilled successfully
- Zero duplicate enrollments created

---

## Implementation Notes

**Implemented on:** 2026-01-19

**Testing Results:**
- Migration script dry-run: ✅ Identified 5 users without enrollments
- Migration script production: ✅ Backfilled 5 users with 10 total enrollments (2 courses × 5 users)
- Idempotency: ✅ Script safe to re-run (0 new enrollments on second run)
- Final verification: ✅ All 6 users have enrollments (11 total enrollments)

**Files Created:**
- `actions/enrollment.ts` - Auto-enrollment helper function
- `scripts/backfill-enrollments.ts` - Backfill script for existing users
- `scripts/verify-enrollments.ts` - Verification script

**Files Modified:**
- `actions/auth.ts` - Credentials signup integration
- `auth.ts` - Google OAuth integration

**Database State:**
- Total users: 6
- Users with enrollments: 6 (100%)
- Users without enrollments: 0
- Total enrollments: 11
- Published courses: 2

**Manual Testing Required:**
- ⏳ Credentials signup auto-enrollment (requires UI testing)
- ⏳ Google OAuth first-time auto-enrollment (requires UI testing)
- ⏳ Google OAuth returning user - no duplicates (requires UI testing)

**Deployment Notes:**
- No schema changes required
- Migration script can be run on production database
- Auto-enrollment happens asynchronously, doesn't block auth flows
- All errors are caught and logged, don't break user signup/signin
- Script is idempotent and safe to re-run
