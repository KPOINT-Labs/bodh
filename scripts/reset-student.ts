import "dotenv/config";
import { prisma } from "../lib/prisma";

/**
 * Reset a student to a new user state by deleting all their progress data.
 *
 * This deletes:
 * - LessonProgress
 * - ConfidenceRating
 * - FAAttempt
 * - MessageFeedback
 * - Threads (cascades to Conversations -> Messages -> SarvamSessions)
 * - LearningProfile
 *
 * Preserves:
 * - User account
 * - Enrollments (course access)
 *
 * Usage:
 *   bun run scripts/reset-student.ts <email-or-user-id>
 */
async function resetStudent(identifier: string) {
  // Find the user by email or ID
  let user = await prisma.user.findUnique({
    where: { email: identifier },
  });

  if (!user) {
    user = await prisma.user.findUnique({
      where: { id: identifier },
    });
  }

  if (!user) {
    console.error(`User not found with email or ID: ${identifier}`);
    process.exit(1);
  }

  console.log(`\nResetting student: ${user.name} (${user.email})`);
  console.log("User ID:", user.id);
  console.log("\n--- Deleting progress data ---\n");

  // Delete FA attempts
  const faResult = await prisma.fAAttempt.deleteMany({
    where: { userId: user.id },
  });
  console.log(`Deleted ${faResult.count} FA attempts`);

  // Delete message feedback
  const feedbackResult = await prisma.messageFeedback.deleteMany({
    where: { userId: user.id },
  });
  console.log(`Deleted ${feedbackResult.count} message feedbacks`);

  // Delete confidence ratings
  const confidenceResult = await prisma.confidenceRating.deleteMany({
    where: { userId: user.id },
  });
  console.log(`Deleted ${confidenceResult.count} confidence ratings`);

  // Delete lesson progress
  const progressResult = await prisma.lessonProgress.deleteMany({
    where: { userId: user.id },
  });
  console.log(`Deleted ${progressResult.count} lesson progress records`);

  // Delete threads (cascades to conversations, messages, sarvam sessions)
  const threadResult = await prisma.thread.deleteMany({
    where: { userId: user.id },
  });
  console.log(`Deleted ${threadResult.count} threads (+ cascaded conversations/messages)`);

  // Delete learning profile
  const profileResult = await prisma.learningProfile.deleteMany({
    where: { userId: user.id },
  });
  console.log(`Deleted ${profileResult.count} learning profile`);

  console.log("\n--- Reset complete ---");
  console.log(`Student "${user.name}" has been reset to a new user state.`);
}

// Get identifier from command line args
const identifier = process.argv[2];

if (!identifier) {
  console.error("Usage: bun run scripts/reset-student.ts <email-or-user-id>");
  console.error("Example: bun run scripts/reset-student.ts learner@bodh.app");
  process.exit(1);
}

resetStudent(identifier)
  .catch((error) => {
    console.error("Error resetting student:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
