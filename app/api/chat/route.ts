import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SARVAM_PROMPT_API_URL = "https://swayam.arya.sarvam.ai/api/chat/prompt/prompt";
const SARVAM_SESSION_API_URL = "https://swayam.arya.sarvam.ai/api/chat/session";

// TODO: Move to environment variable
const SARVAM_AUTH_COOKIE = `arya-auth-internal.session_token=HGdkdTwRlmMlRVYrPmh8cRXvDVsHjYlF.A8xpYB9jcQOZ2Gr39dWHEqyR%2Bd3TngkjSjbEOLZFbVA%3D; arya-auth=eyJhbGciOiJFZERTQSIsImtpZCI6IndvbDZIVmFNczFvc1BrczlGR3J2d0c3WWdja1pwYlk3In0.eyJpYXQiOjE3NjY0ODYxMDIsInVpZCI6IjlsbWU0c29pampnUVFnbEJ0NkpIeTBYNmFKbjlUQUtGIiwic3ViIjoiOWxtZTRzb2lqamdRUWdsQnQ2Skh5MFg2YUpuOVRBS0YiLCJ1c2VyX2lkIjoiOWxtZTRzb2lqamdRUWdsQnQ2Skh5MFg2YUpuOVRBS0YiLCJvcmdfaWQiOm51bGwsImV4cCI6MTc2NjQ4NzAwMiwiaXNzIjoiIiwiYXVkIjoiIn0.OynAGSo6bI5GMbrv5Rj9QhcOE94vCbRzPZf_CoQ2zKZRdN_768pj041JFcEJFi8AMjMPmt9hZ2YcOfl0qrmvDA`;

export interface ChatRequest {
  message: string;
  conversationId: string;
  courseId: string;
  taskGraphType?: "QnA" | "FA";
  videoIds?: string[]; // YouTube video IDs
  startTimestamp?: number; // Video timestamp in seconds
}

interface SarvamStep {
  node_uid: string | null;
  t: number;
  content: string;
}

interface SarvamPromptResponse {
  humanTurnUid: string;
  agentTurnUid: string;
  steps: SarvamStep[];
}

/**
 * Classify message type based on content
 * QnA: Questions about the content, explanations, clarifications
 * FA: Formative assessment, quizzes, practice questions
 */
function classifyMessageType(message: string): "QnA" | "FA" {
  const lowerMessage = message.toLowerCase();

  // FA indicators: quiz, test, assess, practice, exercise
  const faKeywords = [
    "quiz", "test", "assess", "practice", "exercise",
    "question me", "ask me", "evaluate", "check my understanding",
    "give me a question", "formative", "mcq", "multiple choice"
  ];

  for (const keyword of faKeywords) {
    if (lowerMessage.includes(keyword)) {
      return "FA";
    }
  }

  // Default to QnA for general questions and explanations
  return "QnA";
}

/**
 * Extract the assistant content from Sarvam response
 * Takes the last step's content from the steps array
 */
function extractAssistantContent(response: SarvamPromptResponse): string {
  if (!response.steps || response.steps.length === 0) {
    return "I couldn't generate a response. Please try again.";
  }

  // Get the last step's content
  const lastStep = response.steps[response.steps.length - 1];
  return lastStep.content || "No content available.";
}

/**
 * Helper to get or create a Sarvam session
 */
async function getOrCreateSarvamSession(
  conversationId: string,
  courseId: string,
  taskGraphType: string = "QnA"
) {
  // Get the task graph for this course
  const taskGraph = await prisma.taskGraph.findFirst({
    where: {
      courseId,
      type: taskGraphType,
    },
  });

  if (!taskGraph) {
    throw new Error(`No ${taskGraphType} task graph found for this course`);
  }

  // Check if a session already exists
  const existingSession = await prisma.sarvamSession.findUnique({
    where: {
      conversationId_taskGraphId: {
        conversationId,
        taskGraphId: taskGraph.id,
      },
    },
  });

  if (existingSession) {
    return existingSession;
  }

  // Create new session via Sarvam API
  const sessionRequestBody = {
    task_graph_uid: taskGraph.graphId,
  };

  console.log("=== SARVAM SESSION CREATE API ===");
  console.log("URL:", SARVAM_SESSION_API_URL);
  console.log("Request Body:", JSON.stringify(sessionRequestBody, null, 2));

  const sarvamResponse = await fetch(SARVAM_SESSION_API_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      Cookie: SARVAM_AUTH_COOKIE,
    },
    body: JSON.stringify(sessionRequestBody),
  });

  console.log("Response Status:", sarvamResponse.status);

  if (!sarvamResponse.ok) {
    const errorText = await sarvamResponse.text();
    console.log("Error Response:", errorText);
    throw new Error(`Failed to create Sarvam session: ${errorText}`);
  }

  const sessionId = await sarvamResponse.text();
  const cleanSessionId = sessionId.replace(/"/g, "").trim();
  console.log("Session ID Created:", cleanSessionId);
  console.log("=== END SESSION CREATE ===");

  // Store the session
  const sarvamSession = await prisma.sarvamSession.create({
    data: {
      sessionId: cleanSessionId,
      taskGraphId: taskGraph.id,
      conversationId,
      status: "active",
    },
  });

  return sarvamSession;
}

/**
 * POST /api/chat
 * Send a message and get a response from Sarvam using the prompt API
 */
export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const {
      message,
      conversationId,
      courseId,
      taskGraphType: providedType,
      videoIds = [],
      startTimestamp = 0
    } = body;

    console.log("=== CHAT API REQUEST ===");
    console.log("Message:", message);
    console.log("Conversation ID:", conversationId);
    console.log("Course ID:", courseId);
    console.log("Provided Task Graph Type:", providedType);
    console.log("Video IDs:", videoIds);
    console.log("Start Timestamp:", startTimestamp);

    if (!message || !conversationId || !courseId) {
      return NextResponse.json(
        { error: "message, conversationId, and courseId are required" },
        { status: 400 }
      );
    }

    // Classify message type if not provided
    const taskGraphType = providedType || classifyMessageType(message);
    console.log("Classified Task Graph Type:", taskGraphType);

    // Store user message first
    const userMessage = await prisma.message.create({
      data: {
        conversationId,
        role: "user",
        content: message,
        messageType: taskGraphType.toLowerCase(),
      },
    });

    // Get or create Sarvam session for the appropriate task graph type
    const session = await getOrCreateSarvamSession(
      conversationId,
      courseId,
      taskGraphType
    );

    // Build the request body for Sarvam prompt API
    const promptRequestBody: {
      sessionUid: string;
      prompt: string;
      ledger_init?: {
        video_ids: string[];
        start_timestamp: number;
      };
    } = {
      sessionUid: session.sessionId,
      prompt: message,
    };

    // Only include ledger_init if video IDs are provided
    if (videoIds.length > 0) {
      promptRequestBody.ledger_init = {
        video_ids: videoIds,
        start_timestamp: startTimestamp,
      };
    }

    console.log("=== SARVAM PROMPT API ===");
    console.log("URL:", SARVAM_PROMPT_API_URL);
    console.log("Request Body:", JSON.stringify(promptRequestBody, null, 2));
    console.log("Session ID:", session.sessionId);
    console.log("Task Graph Type:", taskGraphType);
    console.log("Video IDs:", videoIds);
    console.log("Start Timestamp:", startTimestamp);

    // Send message to Sarvam Prompt API
    const chatResponse = await fetch(SARVAM_PROMPT_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        Cookie: SARVAM_AUTH_COOKIE,
      },
      body: JSON.stringify(promptRequestBody),
    });

    console.log("Response Status:", chatResponse.status);

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error("Sarvam prompt API error:", errorText);
      console.log("=== END PROMPT API (ERROR) ===");

      // Store error response
      const errorMessage = await prisma.message.create({
        data: {
          conversationId,
          role: "assistant",
          content: "I'm sorry, I couldn't process your request. Please try again.",
          messageType: taskGraphType.toLowerCase(),
        },
      });

      return NextResponse.json({
        success: false,
        error: "Failed to get response from Sarvam",
        userMessage,
        assistantMessage: errorMessage,
      });
    }

    const responseData: SarvamPromptResponse = await chatResponse.json();

    console.log("Response Data:", JSON.stringify(responseData, null, 2));
    console.log("Steps Count:", responseData.steps?.length || 0);
    console.log("Human Turn UID:", responseData.humanTurnUid);
    console.log("Agent Turn UID:", responseData.agentTurnUid);

    // Extract the assistant's response from the last step
    const assistantContent = extractAssistantContent(responseData);
    console.log("Extracted Content (first 200 chars):", assistantContent.substring(0, 200));
    console.log("=== END PROMPT API (SUCCESS) ===");

    // Store assistant message
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId,
        role: "assistant",
        content: assistantContent,
        messageType: taskGraphType.toLowerCase(),
      },
    });

    // Update conversation state
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastActivityType: taskGraphType.toLowerCase(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      userMessage,
      assistantMessage,
      taskGraphType,
      sarvamResponse: {
        humanTurnUid: responseData.humanTurnUid,
        agentTurnUid: responseData.agentTurnUid,
        stepsCount: responseData.steps?.length || 0,
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      {
        error: "Failed to process chat message",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
