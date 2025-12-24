import { NextRequest, NextResponse } from "next/server";
import {
  generateCourseSummary,
  generateWelcomeBackMessage,
} from "@/lib/agents/course-welcome-agent";

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
}

export async function POST(request: NextRequest) {
  try {
    const body: AgentRequest = await request.json();
    const { action, context } = body;

    if (!context?.courseTitle) {
      return NextResponse.json(
        { error: "Course title is required" },
        { status: 400 }
      );
    }

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
