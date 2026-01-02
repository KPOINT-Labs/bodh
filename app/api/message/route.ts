import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface MessageRequest {
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  inputType?: string; // "text" | "audio" | "video"
  messageType?: string; // "general" | "qna" | "fa"
  audioUrl?: string;
  audioDuration?: number;
  videoTimestamp?: number;
  emotions?: Record<string, unknown>;
  references?: Record<string, unknown>;
}

/**
 * GET /api/message?conversationId=xxx
 * Get all messages in a conversation
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const conversationId = searchParams.get("conversationId");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      skip: offset,
      take: limit,
      include: {
        feedback: true,
      },
    });

    const totalCount = await prisma.message.count({
      where: { conversationId },
    });

    return NextResponse.json({
      success: true,
      messages,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + messages.length < totalCount,
      },
    });
  } catch (error) {
    console.error("Message API error:", error);
    return NextResponse.json(
      {
        error: "Failed to get messages",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/message
 * Create a new message in a conversation
 */
export async function POST(request: NextRequest) {
  try {
    const body: MessageRequest = await request.json();
    const {
      conversationId,
      role,
      content,
      inputType = "text",
      messageType = "general",
      audioUrl,
      audioDuration,
      videoTimestamp,
      emotions,
      references,
    } = body;

    if (!conversationId || !role || !content) {
      return NextResponse.json(
        { error: "conversationId, role, and content are required" },
        { status: 400 }
      );
    }

    // Validate role
    if (!["user", "assistant", "system"].includes(role)) {
      return NextResponse.json(
        { error: "role must be 'user', 'assistant', or 'system'" },
        { status: 400 }
      );
    }

    // For assistant messages in welcome conversations, check if one already exists
    // This prevents duplicate welcome messages
    if (role === "assistant") {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            where: { role: "assistant" },
            take: 1,
          },
        },
      });

      if (conversation?.contextType === "welcome" && conversation.messages.length > 0) {
        // Return existing message instead of creating duplicate
        return NextResponse.json({
          success: true,
          message: conversation.messages[0],
          existing: true,
        });
      }
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        role,
        content,
        inputType,
        messageType,
        audioUrl,
        audioDuration,
        videoTimestamp,
        emotions: emotions || undefined,
        references: references || undefined,
      },
    });

    // Update conversation's updatedAt timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("Message API error:", error);
    return NextResponse.json(
      {
        error: "Failed to create message",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
