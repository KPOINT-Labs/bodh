import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface ConversationRequest {
  threadId: string;
  lessonId?: string | null;
  contextType?: string; // "welcome" | "lesson" | "general"
  currentTopic?: string;
}

/**
 * GET /api/conversation?threadId=xxx&lessonId=xxx&contextType=xxx
 * Get or create a conversation within a thread
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const threadId = searchParams.get("threadId");
    const lessonId = searchParams.get("lessonId");
    const contextType = searchParams.get("contextType") || "general";

    if (!threadId) {
      return NextResponse.json(
        { error: "threadId is required" },
        { status: 400 }
      );
    }

    // Find existing conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        threadId,
        lessonId: lessonId || null,
        contextType,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    // If no conversation exists, create one
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          threadId,
          lessonId: lessonId || null,
          contextType,
          status: "active",
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });
    }

    // Transform the response to use lowercase field names for frontend compatibility
    const transformedConversation = {
      ...conversation,
      messages: conversation.messages || [],
    };

    return NextResponse.json({
      success: true,
      conversation: transformedConversation,
    });
  } catch (error) {
    console.error("Conversation API error:", error);
    return NextResponse.json(
      {
        error: "Failed to get/create conversation",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/conversation
 * Create a new conversation within a thread
 */
export async function POST(request: NextRequest) {
  try {
    const body: ConversationRequest = await request.json();
    const { threadId, lessonId, contextType = "general", currentTopic } = body;

    if (!threadId) {
      return NextResponse.json(
        { error: "threadId is required" },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.create({
      data: {
        threadId,
        lessonId: lessonId || null,
        contextType,
        currentTopic,
        status: "active",
      },
      include: {
        messages: true,
      },
    });

    // Transform the response to use lowercase field names for frontend compatibility
    const transformedConversation = {
      ...conversation,
      messages: conversation.messages || [],
    };

    return NextResponse.json({
      success: true,
      conversation: transformedConversation,
    });
  } catch (error) {
    console.error("Conversation API error:", error);
    return NextResponse.json(
      {
        error: "Failed to create conversation",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
