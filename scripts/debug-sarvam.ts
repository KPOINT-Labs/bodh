import "dotenv/config";
import { prisma } from "../lib/prisma";

/**
 * Debug script to check TaskGraph and SarvamSession tables
 */
async function debugSarvam() {
  console.log("=== DEBUGGING SARVAM TABLES ===\n");

  // 1. Check TaskGraph entries
  console.log("1. TaskGraph entries:");
  const taskGraphs = await prisma.taskGraph.findMany({
    select: {
      id: true,
      courseId: true,
      type: true,
      graphId: true,
      createdAt: true,
    },
  });

  if (taskGraphs.length === 0) {
    console.log(
      "   ⚠️  NO TaskGraph entries found! This is why sessions aren't being created."
    );
    console.log("   You need to add TaskGraph entries for your courses.\n");
  } else {
    console.log(`   Found ${taskGraphs.length} TaskGraph entries:`);
    taskGraphs.forEach((tg) => {
      console.log(`   - id: ${tg.id}`);
      console.log(`     courseId: ${tg.courseId}`);
      console.log(`     type: ${tg.type}`);
      console.log(`     graphId: ${tg.graphId}`);
      console.log("");
    });
  }

  // 2. Check SarvamSession entries
  console.log("\n2. SarvamSession entries:");
  const sessions = await prisma.sarvamSession.findMany({
    select: {
      id: true,
      sessionId: true,
      taskGraphId: true,
      conversationId: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  if (sessions.length === 0) {
    console.log("   No SarvamSession entries found.\n");
  } else {
    console.log(
      `   Found ${sessions.length} SarvamSession entries (showing latest 10):`
    );
    sessions.forEach((s) => {
      console.log(`   - id: ${s.id}`);
      console.log(`     sessionId: ${s.sessionId}`);
      console.log(`     taskGraphId: ${s.taskGraphId}`);
      console.log(`     conversationId: ${s.conversationId}`);
      console.log(`     status: ${s.status}`);
      console.log(`     createdAt: ${s.createdAt}`);
      console.log("");
    });
  }

  // 3. Check recent Conversations
  console.log("\n3. Recent Conversations:");
  const conversations = await prisma.conversation.findMany({
    select: {
      id: true,
      contextType: true,
      currentTopic: true,
      thread: {
        select: {
          moduleId: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  if (conversations.length === 0) {
    console.log("   No conversations found.\n");
  } else {
    conversations.forEach((c) => {
      console.log(`   - id: ${c.id}`);
      console.log(`     contextType: ${c.contextType}`);
      console.log(`     moduleId: ${c.thread?.moduleId}`);
      console.log(`     currentTopic: ${c.currentTopic}`);
      console.log("");
    });
  }

  console.log("=== END DEBUG ===");
}

debugSarvam()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
