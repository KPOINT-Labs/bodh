import { NextRequest, NextResponse } from "next/server";
import {
  generateCourseSummary,
  generateWelcomeBackMessage,
  streamCourseSummary,
  streamWelcomeBackMessage,
} from "@/lib/agents/course-welcome-agent";

// Enable streaming for this route
export const dynamic = "force-dynamic";

export interface AgentRequest {
  action: "welcome" | "welcome_back";
  context: {
    courseTitle: string;
    courseDescription?: string | null;
    learningObjectives?: string[];
    moduleTitle?: string;
    lessonTitle?: string;
    lessonNumber?: number;
    // For returning students
    lastLesson?: string;
    progress?: number;
  };
  stream?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: AgentRequest = await request.json();
    const { action, context, stream = false } = body;

    if (!context?.courseTitle) {
      return NextResponse.json(
        { error: "Course title is required" },
        { status: 400 }
      );
    }

    // Handle streaming response
    if (stream) {
      let generator: AsyncGenerator<string, void, unknown>;

      switch (action) {
        case "welcome":
          generator = streamCourseSummary(context);
          break;
        case "welcome_back":
          generator = streamWelcomeBackMessage(context);
          break;
        default:
          return NextResponse.json(
            { error: `Unknown action: ${action}` },
            { status: 400 }
          );
      }

      // Create a readable stream from the async generator
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of generator) {
              controller.enqueue(encoder.encode(chunk));
            }
            controller.close();
          } catch (error) {
            console.error("Stream error:", error);
            controller.error(error);
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    // Non-streaming response (original behavior)
    let response: string;

    switch (action) {
      case "welcome":
        response = await generateCourseSummary(context);
        break;

      case "welcome_back":
        response = await generateWelcomeBackMessage(context);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: response,
      action,
    });
  } catch (error) {
    console.error("Agent API error:", error);
    return NextResponse.json(
      {
        error: "Failed to process agent request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
