import "dotenv/config";
import { prisma } from "../lib/prisma";

/**
 * Delete all threads and related data from the database
 * This cascades to: Conversations -> Messages
 */
async function deleteThreads() {
  console.log("Deleting all threads and related data...");

  // First delete FAAttempts (not cascaded)
  const faResult = await prisma.fAAttempt.deleteMany({});
  console.log(`Deleted ${faResult.count} FA attempts`);

  // Delete all threads (cascades to conversations and messages)
  const threadResult = await prisma.thread.deleteMany({});
  console.log(`Deleted ${threadResult.count} threads`);

  console.log("Done!");
}

deleteThreads()
  .catch((error) => {
    console.error("Error deleting threads:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
