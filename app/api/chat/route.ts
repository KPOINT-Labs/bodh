import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { parseAssessmentContent, isAssessmentContent } from "@/lib/chat/assessment";

const SARVAM_PROMPT_API_URL = "https://swayam.arya.sarvam.ai/api/chat/prompt/prompt";
const SARVAM_SESSION_API_URL = "https://swayam.arya.sarvam.ai/api/chat/session";

// TODO: Move to environment variable
const SARVAM_AUTH_COOKIE = `arya-auth-internal.session_token=HGdkdTwRlmMlRVYrPmh8cRXvDVsHjYlF.A8xpYB9jcQOZ2Gr39dWHEqyR%2Bd3TngkjSjbEOLZFbVA%3D; arya-auth=eyJhbGciOiJFZERTQSIsImtpZCI6IndvbDZIVmFNczFvc1BrczlGR3J2d0c3WWdja1pwYlk3In0.eyJpYXQiOjE3NjY0ODYxMDIsInVpZCI6IjlsbWU0c29pampnUVFnbEJ0NkpIeTBYNmFKbjlUQUtGIiwic3ViIjoiOWxtZTRzb2lqamdRUWdsQnQ2Skh5MFg2YUpuOVRBS0YiLCJ1c2VyX2lkIjoiOWxtZTRzb2lqamdRUWdsQnQ2Skh5MFg2YUpuOVRBS0YiLCJvcmdfaWQiOm51bGwsImV4cCI6MTc2NjQ4NzAwMiwiaXNzIjoiIiwiYXVkIjoiIn0.OynAGSo6bI5GMbrv5Rj9QhcOE94vCbRzPZf_CoQ2zKZRdN_768pj041JFcEJFi8AMjMPmt9hZ2YcOfl0qrmvDA`;

// In-memory cache for sessions to avoid repeated DB queries
// Key format: `${conversationId}:${taskGraphType}`
const sessionCache = new Map<string, { sessionId: string; taskGraphId: string }>();

// Cache for task graphs by courseId:type
const taskGraphCache = new Map<string, { id: string; graphId: string }>();

export interface ChatRequest {
  message: string;
  conversationId: string;
  courseId: string;
  taskGraphType?: "QnA" | "FA";
  videoIds?: string[]; // YouTube video IDs
  startTimestamp?: number; // Video timestamp in seconds
  isAnswer?: boolean; // True if this is an answer to an FA question (not a new assessment request)
}

interface SarvamStep {
  node_uid: string | null;
  t: number;
  content?: string;
  // Tool call fields (t: 17)
  id?: string;
  name?: string;
  arg?: string;
  mcp_uid?: string;
}

// Sarvam step types
const SARVAM_STEP_TYPE = {
  TOOL_RESULT: 15,    // Tool execution result (raw JSON)
  TOOL_CALL: 17,      // Tool invocation (has name, arg)
  ASSISTANT: 20,      // Assistant's response (has content)
} as const;

interface SarvamPromptResponse {
  humanTurnUid: string;
  agentTurnUid: string;
  steps: SarvamStep[];
}

/**
 * Use Gemini LLM to classify ambiguous messages
 */
async function classifyWithLLM(message: string): Promise<"QnA" | "FA"> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY not set, defaulting to QnA");
      return "QnA";
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: `You are a message intent classifier for an educational platform.
Classify the user's message into one of two categories:

- QnA: The user is asking questions, seeking explanations, wanting to understand concepts, or requesting information about the topic.
- FA: The user wants to be tested, quizzed, assessed, or wants practice questions to check their understanding.

Respond with ONLY "QnA" or "FA" - nothing else.`,
    });

    const result = await model.generateContent(message);
    const response = result.response.text().trim().toUpperCase();

    if (response === "FA") {
      return "FA";
    }
    return "QnA";
  } catch (error) {
    console.error("LLM classification error:", error);
    return "QnA"; // Default to QnA on error
  }
}

/**
 * Classify message type based on content using hybrid approach
 * QnA: Questions about the content, explanations, clarifications
 * FA: Formative assessment, quizzes, practice questions
 *
 * Uses keyword matching for obvious cases, LLM for ambiguous ones
 */
async function classifyMessageType(message: string): Promise<"QnA" | "FA"> {
  const lowerMessage = message.toLowerCase();

  // === FAST PATH: Obvious FA patterns (no LLM needed) ===
  const obviousFaPatterns = [
    "quiz me", "test me", "assess me", "question me", "challenge me",
    "ask me question", "ask me a question", "give me a quiz",
    "check my understanding", "check my knowledge", "test my knowledge",
    "mcq", "multiple choice", "true or false", "pop quiz",
    "drill me", "grill me"
  ];

  for (const pattern of obviousFaPatterns) {
    if (lowerMessage.includes(pattern)) {
      console.log("Classification: FA (obvious pattern match)");
      return "FA";
    }
  }

  // === FAST PATH: Obvious QnA patterns (no LLM needed) ===
  const obviousQnaPatterns = [
    "what is", "what's", "what are", "explain", "how does", "how do",
    "tell me about", "describe", "why is", "why does", "why do",
    "can you explain", "help me understand", "i don't understand",
    "what does", "define", "definition", "meaning of"
  ];

  for (const pattern of obviousQnaPatterns) {
    if (lowerMessage.includes(pattern)) {
      console.log("Classification: QnA (obvious pattern match)");
      return "QnA";
    }
  }

  // === SLOW PATH: Ambiguous message - use LLM ===
  console.log("Classification: Ambiguous message, using LLM");
  return await classifyWithLLM(message);
}

/**
 * Extract the assistant content from Sarvam response
 *
 * Sarvam returns multiple step types:
 * - t: 17 (TOOL_CALL) - Tool invocation with name, arg fields
 * - t: 15 (TOOL_RESULT) - Raw JSON result from tool execution
 * - t: 20 (ASSISTANT) - The actual assistant response with content
 *
 * We want to extract only the assistant response (t: 20), not tool calls/results.
 */
function extractAssistantContent(response: SarvamPromptResponse): string {
  if (!response.steps || response.steps.length === 0) {
    return "I couldn't generate a response. Please try again.";
  }

  // Strategy 1: Find step with t: 20 (assistant response)
  const assistantStep = response.steps.find(
    (step) => step.t === SARVAM_STEP_TYPE.ASSISTANT && step.content
  );

  if (assistantStep?.content) {
    return assistantStep.content;
  }

  // Strategy 2: Find the last step that has content but is NOT a tool call/result
  // Tool calls have 'name' field, tool results have t: 15
  for (let i = response.steps.length - 1; i >= 0; i--) {
    const step = response.steps[i];
    const isToolCall = step.name !== undefined;
    const isToolResult = step.t === SARVAM_STEP_TYPE.TOOL_RESULT;

    if (step.content && !isToolCall && !isToolResult) {
      return step.content;
    }
  }

  // Strategy 3: Fallback to last step with content (shouldn't reach here normally)
  const lastStepWithContent = [...response.steps]
    .reverse()
    .find((step) => step.content);

  if (lastStepWithContent?.content) {
    console.warn("Using fallback: last step with content (no t:20 found)");
    return lastStepWithContent.content;
  }

  return "I couldn't generate a response. Please try again.";
}

/**
 * Helper to get or create a Sarvam session
 * Uses in-memory caching to avoid repeated DB queries for the same conversation
 */
async function getOrCreateSarvamSession(
  conversationId: string,
  courseId: string,
  taskGraphType: string = "QnA"
) {
  const sessionCacheKey = `${conversationId}:${taskGraphType}`;
  const taskGraphCacheKey = `${courseId}:${taskGraphType}`;

  // Check session cache first - if found, return immediately (no DB queries)
  const cachedSession = sessionCache.get(sessionCacheKey);
  if (cachedSession) {
    console.log("Session cache HIT:", sessionCacheKey);
    return { sessionId: cachedSession.sessionId, taskGraphId: cachedSession.taskGraphId };
  }

  console.log("Session cache MISS:", sessionCacheKey);

  // Get task graph - check cache first
  let taskGraph = taskGraphCache.get(taskGraphCacheKey);
  if (!taskGraph) {
    console.log("TaskGraph cache MISS:", taskGraphCacheKey);
    const dbTaskGraph = await prisma.taskGraph.findFirst({
      where: {
        courseId,
        type: taskGraphType,
      },
      select: { id: true, graphId: true },
    });

    if (!dbTaskGraph) {
      throw new Error(`No ${taskGraphType} task graph found for this course`);
    }

    taskGraph = { id: dbTaskGraph.id, graphId: dbTaskGraph.graphId };
    taskGraphCache.set(taskGraphCacheKey, taskGraph);
  } else {
    console.log("TaskGraph cache HIT:", taskGraphCacheKey);
  }

  // Check if a session already exists in DB
  const existingSession = await prisma.sarvamSession.findUnique({
    where: {
      conversationId_taskGraphId: {
        conversationId,
        taskGraphId: taskGraph.id,
      },
    },
    select: { sessionId: true, taskGraphId: true },
  });

  if (existingSession) {
    // Cache for future requests
    sessionCache.set(sessionCacheKey, {
      sessionId: existingSession.sessionId,
      taskGraphId: existingSession.taskGraphId,
    });
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

  // Store the session in DB
  await prisma.sarvamSession.create({
    data: {
      sessionId: cleanSessionId,
      taskGraphId: taskGraph.id,
      conversationId,
      status: "active",
    },
  });

  // Cache the new session
  const newSession = { sessionId: cleanSessionId, taskGraphId: taskGraph.id };
  sessionCache.set(sessionCacheKey, newSession);

  return newSession;
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
      startTimestamp = 0,
      isAnswer: isAnswerFlag = false
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
    const taskGraphType = providedType || await classifyMessageType(message);
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
    // For FA (Formative Assessment), add the assessment prompt only for NEW assessment requests
    // If isAnswerFlag is true, this is an answer to an existing question - don't add the prompt
    const finalPrompt = taskGraphType === "FA" && !isAnswerFlag
      ? `Be in assessment mode. Generate EXACTLY 5 questions (use mixed question types if needed). Ask questions one by one. If the user answers 3 or more questions correctly, stop the assessment and provide feedback. IMPORTANT: Do NOT tell the user about the 5 question limit or the 3 correct answers threshold. Do NOT mention "I will ask 5 questions" or similar. Just start with the first question naturally.\n\nUser request: ${message}`
      : message;

    const promptRequestBody: {
      sessionUid: string;
      prompt: string;
      ledger_init?: {
        video_ids: string[];
        start_timestamp: number;
      };
    } = {
      sessionUid: session.sessionId,
      prompt: finalPrompt,
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

    // Handle FAAttempt creation for FA answers
    if (taskGraphType === "FA" && userMessage) {
      try {
        // Get the user ID from the conversation
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: {
            thread: {
              select: { userId: true }
            }
          }
        });

        if (conversation?.thread?.userId) {
          // Find the most recent FA question from assistant
          const recentFAQuestion = await prisma.message.findFirst({
            where: {
              conversationId,
              role: "assistant",
              messageType: "fa",
              createdAt: {
                lt: userMessage.createdAt
              }
            },
            orderBy: {
              createdAt: "desc"
            }
          });

          // Check if the assistant message contains FA questions
          if (recentFAQuestion && isAssessmentContent(recentFAQuestion.content)) {
            const parsed = parseAssessmentContent(recentFAQuestion.content);
            
            // If there are questions and user provided a short answer (likely answering a question)
            if (parsed.questions.length > 0 && message.trim().length <= 500) {
              // Get the most recent question (usually the last one asked)
              const lastQuestion = parsed.questions[parsed.questions.length - 1];
              
              // Create or update FAAttempt record
              await prisma.fAAttempt.upsert({
                where: {
                  userId_messageId: {
                    userId: conversation.thread.userId,
                    messageId: recentFAQuestion.id
                  }
                },
                create: {
                  userId: conversation.thread.userId,
                  messageId: recentFAQuestion.id,
                  question: lastQuestion.questionText,
                  answer: message,
                  isAttempted: true,
                  questionType: lastQuestion.answerType,
                  // isCorrect will be determined later by evaluation
                },
                update: {
                  answer: message,
                  isAttempted: true,
                  questionType: lastQuestion.answerType,
                  updatedAt: new Date()
                }
              });

              console.log("FAAttempt created for question:", lastQuestion.questionText);
            }
          }
        }
      } catch (error) {
        console.error("Error creating FAAttempt:", error);
        // Don't fail the request if FAAttempt creation fails
      }
    }

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
