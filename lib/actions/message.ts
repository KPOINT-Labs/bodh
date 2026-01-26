"use server";

import { prisma } from "@/lib/prisma";

/**
 * Update the action status on a message
 * Called when user clicks an action button
 */
export async function updateMessageActionStatus(
  messageId: string,
  status: "handled" | "dismissed",
  buttonId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Use raw update to avoid type issues if Prisma client is out of sync
    await prisma.$executeRaw`
      UPDATE "Message"
      SET "actionStatus" = ${status},
          "actionHandledButtonId" = ${buttonId}
      WHERE id = ${messageId}
    `;

    return { success: true };
  } catch (error) {
    console.error("[updateMessageActionStatus] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update message action",
    };
  }
}
