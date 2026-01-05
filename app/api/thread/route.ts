import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface ThreadRequest {
  userId: string;
  moduleId: string;
}

/**
 * GET /api/thread?userId=xxx&moduleId=xxx
 * Get or create a thread for a user in a specific module
 * Updated to use capitalized relation names
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const moduleId = searchParams.get("moduleId");

    if (!userId || !moduleId) {
      return NextResponse.json(
        { error: "userId and moduleId are required" },
        { status: 400 }
      );
    }

    // Find or create thread for this user + module combination
    console.log("Finding thread for:", { userId, moduleId });
    let thread = await prisma.thread.findUnique({
      where: {
        userId_moduleId: {
          userId,
          moduleId,
        },
      },
      include: {
        conversations: {
          orderBy: { createdAt: "desc" },
          include: {
            messages: {
              orderBy: { createdAt: "asc" },
              take: 50, // Limit messages per conversation
            },
          },
        },
      },
    });

    if (!thread) {
      thread = await prisma.thread.create({
        data: {
          userId,
          moduleId,
        },
        include: {
          conversations: {
            orderBy: { createdAt: "desc" },
            include: {
              messages: {
                orderBy: { createdAt: "asc" },
              },
            },
          },
        },
      });
    }

    // Transform the response to use lowercase field names for frontend compatibility
    const transformedThread = {
      ...thread,
      conversations: thread.conversations.map((conv: any) => ({
        ...conv,
        messages: conv.messages,
      })),
    };

    return NextResponse.json({
      success: true,
      thread: transformedThread,
    });
  } catch (error) {
    console.error("Thread API error:", error);
    return NextResponse.json(
      {
        error: "Failed to get/create thread",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/thread
 * Create a new thread for a user in a module
 */
export async function POST(request: NextRequest) {
  try {
    const body: ThreadRequest = await request.json();
    const { userId, moduleId } = body;

    if (!userId || !moduleId) {
      return NextResponse.json(
        { error: "userId and moduleId are required" },
        { status: 400 }
      );
    }

    // Use upsert to handle race conditions
    const thread = await prisma.thread.upsert({
      where: {
        userId_moduleId: {
          userId,
          moduleId,
        },
      },
      update: {
        updatedAt: new Date(),
      },
      create: {
        userId,
        moduleId,
      },
      include: {
        conversations: true,
      },
    });

    // Transform the response to use lowercase field names for frontend compatibility
    const transformedThread = {
      ...thread,
      conversations: thread.conversations.map((conv: any) => ({
        ...conv,
        messages: conv.messages,
      })),
    };

    return NextResponse.json({
      success: true,
      thread: transformedThread,
    });
  } catch (error) {
    console.error("Thread API error:", error);
    return NextResponse.json(
      {
        error: "Failed to create thread",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
