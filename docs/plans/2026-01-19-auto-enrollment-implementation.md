# Auto-Enrollment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automatically enroll new users in all published courses upon signup (credentials and Google OAuth) and backfill existing users.

**Architecture:** Centralized helper function `autoEnrollNewUser()` called from both credentials signup (`actions/auth.ts`) and Google OAuth flow (`auth.ts`). Uses Prisma `createMany` with `skipDuplicates` for safe bulk enrollment. Error handling ensures enrollment failures don't block user creation.

**Tech Stack:** Next.js 16, Prisma 7, PostgreSQL, NextAuth.js, TypeScript, Bun

---

## Task 1: Create Auto-Enrollment Helper Function

**Files:**
- Create: `actions/enrollment.ts`

**Step 1: Create the auto-enrollment action file**

Create `actions/enrollment.ts` with the helper function:

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

**Step 2: Verify file was created correctly**

Run: `cat actions/enrollment.ts`

Expected: File contents match the code above

**Step 3: Commit**

```bash
git add actions/enrollment.ts
git commit -m "feat: add auto-enrollment helper function"
```

---

## Task 2: Integrate Auto-Enrollment into Credentials Signup

**Files:**
- Modify: `actions/auth.ts:50-95`

**Step 1: Import auto-enrollment function**

At the top of `actions/auth.ts`, add the import after existing imports:

```typescript
import { autoEnrollNewUser } from "./enrollment";
```

**Step 2: Add auto-enrollment call after user creation**

In the `signup()` function, modify lines 86-94 to capture the created user and call auto-enrollment:

Replace:
```typescript
  // Create user
  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
    },
  });

  return { success: true };
```

With:
```typescript
  // Create user
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

**Step 3: Verify changes**

Run: `cat actions/auth.ts | grep -A 15 "Create user"`

Expected: Shows the modified code with `createdUser` variable and `autoEnrollNewUser` call

**Step 4: Commit**

```bash
git add actions/auth.ts
git commit -m "feat: integrate auto-enrollment into credentials signup"
```

---

## Task 3: Integrate Auto-Enrollment into Google OAuth Flow

**Files:**
- Modify: `auth.ts:68-93`

**Step 1: Import auto-enrollment function**

At the top of `auth.ts`, add the import after existing imports:

```typescript
import { autoEnrollNewUser } from "@/actions/enrollment";
```

**Step 2: Add enrollment check and auto-enrollment**

In the `signIn` callback, modify the Google OAuth block (lines 70-90) to check enrollments and auto-enroll new users:

Replace:
```typescript
      if (account?.provider === "google") {
        const email = user.email;
        if (!email) {
          return false;
        }

        try {
          // Create user if not exists, update last login either way
          await prisma.user.upsert({
            where: { email },
            update: { lastLoginAt: new Date() },
            create: {
              email,
              name: user.name || email.split("@")[0],
              passwordHash: null,
            },
          });
        } catch (error) {
          console.error("[Auth] Database error during Google sign-in:", error);
          return false;
        }
      }
```

With:
```typescript
      if (account?.provider === "google") {
        const email = user.email;
        if (!email) {
          return false;
        }

        try {
          // Create user if not exists, update last login either way
          const dbUser = await prisma.user.upsert({
            where: { email },
            update: { lastLoginAt: new Date() },
            create: {
              email,
              name: user.name || email.split("@")[0],
              passwordHash: null,
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
        } catch (error) {
          console.error("[Auth] Database error during Google sign-in:", error);
          return false;
        }
      }
```

**Step 3: Verify changes**

Run: `cat auth.ts | grep -A 30 "if (account?.provider === \"google\")"`

Expected: Shows the modified code with `dbUser` capture, enrollment count check, and conditional `autoEnrollNewUser` call

**Step 4: Commit**

```bash
git add auth.ts
git commit -m "feat: integrate auto-enrollment into Google OAuth flow"
```

---

## Task 4: Create Migration Script for Existing Users

**Files:**
- Create: `scripts/backfill-enrollments.ts`

**Step 1: Create scripts directory if it doesn't exist**

Run: `mkdir -p scripts`

**Step 2: Create the backfill script**

Create `scripts/backfill-enrollments.ts`:

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

**Step 3: Verify script was created**

Run: `cat scripts/backfill-enrollments.ts`

Expected: File contents match the code above

**Step 4: Commit**

```bash
git add scripts/backfill-enrollments.ts
git commit -m "feat: add backfill script for existing users"
```

---

## Task 5: Test Credentials Signup Auto-Enrollment

**Files:**
- Test via UI: signup flow

**Step 1: Start development server**

Run: `bun run dev`

Expected: Development server starts on port 3000

**Step 2: Create test user via credentials signup**

1. Navigate to `http://localhost:3000/signup`
2. Fill out signup form with test data:
   - Invite code: Use valid code (6 digits summing to 16, e.g., "424234")
   - Name: "Test User Auto Enroll"
   - Email: "test-autoenroll@example.com"
   - Password: "test123"
   - Confirm password: "test123"
3. Submit form

Expected: User successfully created, redirected to login

**Step 3: Verify enrollments in database**

Run: `./node_modules/.bin/prisma studio`

In Prisma Studio:
1. Open `User` table
2. Find user with email "test-autoenroll@example.com"
3. Copy the user's `id`
4. Open `Enrollment` table
5. Filter by `userId` = copied ID

Expected: User has enrollment records for all published courses

**Step 4: Check server logs**

In terminal running `bun run dev`, look for:

Expected output:
```
[AutoEnroll] Enrolled user <userId> in X courses
```

**Step 5: Document test results**

Create a note in the terminal or commit message documenting:
- Number of published courses
- Number of enrollments created
- Timestamp of test

---

## Task 6: Test Google OAuth Auto-Enrollment

**Files:**
- Test via UI: Google OAuth flow

**Step 1: Ensure dev server is running**

If not already running: `bun run dev`

**Step 2: Test with new Google account**

1. Navigate to `http://localhost:3000/login`
2. Click "Sign in with Google"
3. Use a Google account that has never signed in before
4. Complete OAuth flow

Expected: Successfully signed in and redirected

**Step 3: Verify enrollments in database**

Run: `./node_modules/.bin/prisma studio`

In Prisma Studio:
1. Open `User` table
2. Find user with the Google email used
3. Copy the user's `id`
4. Open `Enrollment` table
5. Filter by `userId` = copied ID

Expected: User has enrollment records for all published courses

**Step 4: Check server logs**

In terminal running `bun run dev`, look for:

Expected output:
```
[AutoEnroll] Enrolled user <userId> in X courses
```

**Step 5: Test returning user (no duplicate enrollments)**

1. Sign out
2. Sign in with the same Google account again

Expected: No new enrollment logs, no duplicate enrollments created

**Step 6: Verify no duplicates in database**

In Prisma Studio `Enrollment` table:
- Filter by the Google user's `userId`
- Count enrollments

Expected: Same count as before, no duplicates

---

## Task 7: Run Migration Script (Dry Run)

**Files:**
- Execute: `scripts/backfill-enrollments.ts`

**Step 1: Run script in dry-run mode**

Run: `bun run scripts/backfill-enrollments.ts --dry-run`

Expected output:
```
🔍 Finding users without enrollments...
Found X users without enrollments

Found Y published courses

[DRY RUN] Would enroll user1@example.com in Y courses
[DRY RUN] Would enroll user2@example.com in Y courses
...

📊 Summary:
   Users processed: X
   Total enrollments would be created: Z

💡 Run without --dry-run to apply changes

✨ Done!
```

**Step 2: Verify counts make sense**

Check:
- Number of users without enrollments
- Number of published courses
- Total enrollments calculation (users × courses)

Expected: Numbers are reasonable and match expectations

**Step 3: Document dry-run results**

Note down:
- Users without enrollments count
- Published courses count
- Expected enrollment count

---

## Task 8: Run Migration Script (Production)

**Files:**
- Execute: `scripts/backfill-enrollments.ts`

**Step 1: Run script without dry-run flag**

Run: `bun run scripts/backfill-enrollments.ts`

Expected output:
```
🔍 Finding users without enrollments...
Found X users without enrollments

Found Y published courses

✅ Enrolled user1@example.com in Y courses
✅ Enrolled user2@example.com in Y courses
...

📊 Summary:
   Users processed: X
   Total enrollments created: Z

✨ Done!
```

**Step 2: Verify enrollments in database**

Run: `./node_modules/.bin/prisma studio`

In Prisma Studio:
1. Open `Enrollment` table
2. Check total count increased by expected amount
3. Spot check a few users from migration output
4. Verify each has enrollments for all published courses

Expected: All users now have enrollments

**Step 3: Test idempotency (re-run script)**

Run: `bun run scripts/backfill-enrollments.ts`

Expected output:
```
🔍 Finding users without enrollments...
Found 0 users without enrollments

Found Y published courses

📊 Summary:
   Users processed: 0
   Total enrollments created: 0

✨ Done!
```

Expected: No duplicates created, script safely handles re-runs

---

## Task 9: Final Verification and Cleanup

**Files:**
- Verify: All auth flows and database state

**Step 1: Verify all users have enrollments**

Run query via Prisma Studio or raw SQL:

```sql
SELECT
  (SELECT COUNT(*) FROM "User") as total_users,
  (SELECT COUNT(DISTINCT "userId") FROM "Enrollment") as users_with_enrollments;
```

Expected: Both counts should match

**Step 2: Create test account to verify ongoing auto-enrollment**

1. Sign up with another test account via credentials
2. Check logs for `[AutoEnroll]` message
3. Verify enrollments in database

Expected: Immediate auto-enrollment works

**Step 3: Check for any error logs**

Review server logs for:
- `[AutoEnroll] Failed for user` messages
- Any uncaught exceptions during signup/signin

Expected: No errors (or document any issues found)

**Step 4: Clean up test users (optional)**

If test users should be removed:

```sql
DELETE FROM "User" WHERE email LIKE 'test-%@example.com';
```

Note: Cascade delete will remove related enrollments

**Step 5: Final commit and documentation**

```bash
git add .
git commit -m "test: verify auto-enrollment in all auth flows

- Tested credentials signup auto-enrollment
- Tested Google OAuth auto-enrollment
- Tested returning user (no duplicates)
- Ran migration script for existing users
- Verified all users have enrollments"
```

---

## Task 10: Update Documentation

**Files:**
- Modify: `docs/plans/2026-01-19-auto-enrollment-design.md`

**Step 1: Update design document status**

In `docs/plans/2026-01-19-auto-enrollment-design.md`, change:

```markdown
**Status:** Design Complete
```

To:

```markdown
**Status:** Implemented ✅
**Implemented:** 2026-01-19
```

**Step 2: Add implementation notes section**

At the end of the design document, add:

```markdown
## Implementation Notes

**Implemented on:** 2026-01-19

**Testing Results:**
- Credentials signup: ✅ Auto-enrollment working
- Google OAuth first-time: ✅ Auto-enrollment working
- Google OAuth returning user: ✅ No duplicates created
- Migration script: ✅ Backfilled X existing users with Y total enrollments
- Idempotency: ✅ Script safe to re-run

**Files Modified:**
- `actions/enrollment.ts` (new) - Auto-enrollment helper
- `actions/auth.ts` - Credentials signup integration
- `auth.ts` - Google OAuth integration
- `scripts/backfill-enrollments.ts` (new) - Backfill script

**Deployment Notes:**
- No schema changes required
- Migration script can be run on production database
- Auto-enrollment happens asynchronously, doesn't block auth flows
- All errors are caught and logged, don't break user signup/signin
```

**Step 3: Commit documentation update**

```bash
git add docs/plans/2026-01-19-auto-enrollment-design.md
git commit -m "docs: mark auto-enrollment design as implemented"
```

---

## Success Criteria

- ✅ New users signing up via credentials are auto-enrolled in all published courses
- ✅ New users signing in via Google OAuth for first time are auto-enrolled
- ✅ Returning Google OAuth users don't get duplicate enrollments
- ✅ Existing users successfully backfilled with enrollments
- ✅ Migration script is idempotent and safe to re-run
- ✅ No signup/signin failures due to enrollment logic
- ✅ All errors properly logged with context
- ✅ Documentation updated with implementation status

## Rollback Plan

If critical issues arise:

1. **Disable auto-enrollment**: Comment out `autoEnrollNewUser()` calls in `actions/auth.ts` and `auth.ts`
2. **Remove enrollments**: Delete enrollments created after deployment timestamp
3. **Revert commits**: `git revert <commit-hash>` for each implementation commit
4. **Redeploy**: Push reverted code to production

## Notes

- **DRY**: Centralized enrollment logic in single helper function
- **YAGNI**: No unnecessary features, just core auto-enrollment
- **Error handling**: Non-blocking, logged errors, graceful degradation
- **Database safety**: `skipDuplicates` and unique constraints prevent duplication
- **Testing**: Manual testing via UI, database verification, script dry-run
