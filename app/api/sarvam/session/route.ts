import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SARVAM_API_URL = "https://swayam.arya.sarvam.ai/api/chat/session";

// TODO: Move to environment variable
const SARVAM_AUTH_COOKIE = `arya-auth-internal.session_token=HGdkdTwRlmMlRVYrPmh8cRXvDVsHjYlF.A8xpYB9jcQOZ2Gr39dWHEqyR%2Bd3TngkjSjbEOLZFbVA%3D; arya-auth=eyJhbGciOiJFZERTQSIsImtpZCI6IndvbDZIVmFNczFvc1BrczlGR3J2d0c3WWdja1pwYlk3In0.eyJpYXQiOjE3NjY0ODYxMDIsInVpZCI6IjlsbWU0c29pampnUVFnbEJ0NkpIeTBYNmFKbjlUQUtGIiwic3ViIjoiOWxtZTRzb2lqamdRUWdsQnQ2Skh5MFg2YUpuOVRBS0YiLCJ1c2VyX2lkIjoiOWxtZTRzb2lqamdRUWdsQnQ2Skh5MFg2YUpuOVRBS0YiLCJvcmdfaWQiOm51bGwsImV4cCI6MTc2NjQ4NzAwMiwiaXNzIjoiIiwiYXVkIjoiIn0.OynAGSo6bI5GMbrv5Rj9QhcOE94vCbRzPZf_CoQ2zKZRdN_768pj041JFcEJFi8AMjMPmt9hZ2YcOfl0qrmvDA`;

export interface SarvamSessionRequest {
  courseId: string;
  conversationId: string;
  taskGraphType?: string; // "QnA" | "FA"
}

/**
 * POST /api/sarvam/session
 * Get or create a Sarvam session for a conversation (lazy creation)
 * One conversation can have two sessions (one QnA, one FA)
 */
export async function POST(request: NextRequest) {
  try {
    const body: SarvamSessionRequest = await request.json();
    const { courseId, conversationId, taskGraphType = "QnA" } = body;

    if (!courseId || !conversationId) {
      return NextResponse.json(
        { error: "courseId and conversationId are required" },
        { status: 400 }
      );
    }

    // Get the task graph for this course
    const taskGraph = await prisma.taskGraph.findFirst({
      where: {
        courseId,
        type: taskGraphType,
      },
    });

    if (!taskGraph) {
      return NextResponse.json(
        { error: `No ${taskGraphType} task graph found for this course` },
        { status: 404 }
      );
    }

    // Check if a session already exists for this conversation + task graph type
    // Using the unique constraint: @@unique([conversationId, taskGraphId])
    const existingSession = await prisma.sarvamSession.findUnique({
      where: {
        conversationId_taskGraphId: {
          conversationId,
          taskGraphId: taskGraph.id,
        },
      },
    });

    if (existingSession) {
      return NextResponse.json({
        success: true,
        session: existingSession,
        existing: true,
      });
    }

    // Call Sarvam API to create a new session
    const sarvamResponse = await fetch(SARVAM_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        Cookie: SARVAM_AUTH_COOKIE,
      },
      body: JSON.stringify({
        task_graph_uid: taskGraph.graphId,
      }),
    });

    if (!sarvamResponse.ok) {
      const errorText = await sarvamResponse.text();
      console.error("Sarvam API error:", errorText);
      return NextResponse.json(
        { error: "Failed to create Sarvam session", details: errorText },
        { status: 500 }
      );
    }

    // Sarvam API returns session ID as plain text
    const sessionId = await sarvamResponse.text();
    // Remove quotes if present
    const cleanSessionId = sessionId.replace(/"/g, "").trim();

    // Store the session in our database
    const sarvamSession = await prisma.sarvamSession.create({
      data: {
        sessionId: cleanSessionId,
        taskGraphId: taskGraph.id,
        conversationId,
        status: "active",
      },
    });

    return NextResponse.json({
      success: true,
      session: sarvamSession,
    });
  } catch (error) {
    console.error("Sarvam session API error:", error);
    return NextResponse.json(
      {
        error: "Failed to create Sarvam session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sarvam/session?conversationId=xxx
 * Get an existing Sarvam session for a conversation
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

    const session = await prisma.sarvamSession.findFirst({
      where: { conversationId },
      include: {
        taskGraph: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "No session found for this conversation" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error("Sarvam session API error:", error);
    return NextResponse.json(
      {
        error: "Failed to get Sarvam session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
