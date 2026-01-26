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
    // Handle race conditions: if upsert fails with P2002, retry with findUnique
    console.log("Finding thread for:", { userId, moduleId });

    let thread;
    try {
      thread = await prisma.thread.upsert({
        where: {
          userId_moduleId: {
            userId,
            moduleId,
          },
        },
        update: {
          // Just touch updatedAt if exists
          updatedAt: new Date(),
        },
        create: {
          userId,
          moduleId,
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
    } catch (upsertError: unknown) {
      // Handle race condition: P2002 means another request created it first
      if (
        upsertError &&
        typeof upsertError === "object" &&
        "code" in upsertError &&
        upsertError.code === "P2002"
      ) {
        console.log("Thread upsert race condition, fetching existing thread");
        thread = await prisma.thread.findUnique({
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
                  take: 50,
                },
              },
            },
          },
        });

        if (!thread) {
          throw new Error("Thread not found after race condition");
        }
      } else {
        throw upsertError;
      }
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
 * DELETE /api/thread?userId=xxx&moduleId=xxx
 * Delete a thread and all its conversations and messages for a user in a module
 */
export async function DELETE(request: NextRequest) {
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

    // Find the thread first
    const thread = await prisma.thread.findUnique({
      where: {
        userId_moduleId: {
          userId,
          moduleId,
        },
      },
    });

    if (!thread) {
      return NextResponse.json(
        { error: "Thread not found" },
        { status: 404 }
      );
    }

    // Delete the thread - cascade will handle conversations and messages
    await prisma.thread.delete({
      where: {
        id: thread.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Thread and all related data deleted successfully",
    });
  } catch (error) {
    console.error("Thread DELETE API error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete thread",
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

    // Use upsert to handle race conditions, with P2002 fallback
    let thread;
    try {
      thread = await prisma.thread.upsert({
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
    } catch (upsertError: unknown) {
      // Handle race condition: P2002 means another request created it first
      if (
        upsertError &&
        typeof upsertError === "object" &&
        "code" in upsertError &&
        upsertError.code === "P2002"
      ) {
        console.log("Thread POST upsert race condition, fetching existing thread");
        thread = await prisma.thread.findUnique({
          where: {
            userId_moduleId: {
              userId,
              moduleId,
            },
          },
          include: {
            conversations: true,
          },
        });

        if (!thread) {
          throw new Error("Thread not found after race condition");
        }
      } else {
        throw upsertError;
      }
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
        error: "Failed to create thread",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
