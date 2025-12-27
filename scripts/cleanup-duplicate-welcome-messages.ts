import { prisma } from "../lib/prisma";

async function cleanupDuplicateWelcomeMessages() {
  // Find all welcome conversations
  const welcomeConversations = await prisma.conversation.findMany({
    where: { contextType: "welcome" },
    include: {
      messages: {
        where: { role: "assistant" },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  let deletedCount = 0;

  for (const conversation of welcomeConversations) {
    // If there are multiple assistant messages, keep only the first one
    if (conversation.messages.length > 1) {
      const [firstMessage, ...duplicates] = conversation.messages;
      console.log(
        `Conversation ${conversation.id}: Found ${duplicates.length} duplicate(s)`
      );

      // Delete duplicates
      for (const duplicate of duplicates) {
        await prisma.message.delete({
          where: { id: duplicate.id },
        });
        deletedCount++;
        console.log(`  Deleted message ${duplicate.id}`);
      }

      console.log(`  Kept message ${firstMessage.id}`);
    }
  }

  console.log(`\nCleanup complete. Deleted ${deletedCount} duplicate message(s).`);
}

cleanupDuplicateWelcomeMessages()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
