import { prisma } from "../lib/prisma";

/**
 * Delete all welcome messages from the database.
 * These were stored before we moved welcome message generation to LiveKit agent.
 * Now welcome messages are displayed in real-time and NOT stored in DB.
 */
async function deleteWelcomeMessages() {
  console.log("Finding all welcome conversations...");

  // Find all conversations with contextType "welcome"
  const welcomeConversations = await prisma.conversation.findMany({
    where: {
      contextType: "welcome",
    },
    include: {
      messages: {
        where: {
          role: "assistant",
        },
        orderBy: {
          createdAt: "asc",
        },
        take: 1, // Only the first assistant message (the welcome message)
      },
    },
  });

  console.log(`Found ${welcomeConversations.length} welcome conversations`);

  // Collect IDs of welcome messages to delete (first assistant message in each welcome conversation)
  const welcomeMessageIds: string[] = [];
  for (const conv of welcomeConversations) {
    if (conv.messages.length > 0) {
      welcomeMessageIds.push(conv.messages[0].id);
    }
  }

  console.log(`Found ${welcomeMessageIds.length} welcome messages to delete`);

  if (welcomeMessageIds.length === 0) {
    console.log("No welcome messages to delete");
    return;
  }

  // Delete the welcome messages
  const deleteResult = await prisma.message.deleteMany({
    where: {
      id: { in: welcomeMessageIds },
    },
  });

  console.log(`Deleted ${deleteResult.count} welcome messages`);
  console.log("Done!");
}

deleteWelcomeMessages()
  .catch((error) => {
    console.error("Error deleting welcome messages:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
