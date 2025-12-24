import { GoogleGenerativeAI } from "@google/generative-ai";
import { getCourseWelcomePrompt, getReturningStudentPrompt, CourseContext } from "./prompts";

// Agent configuration following ADK pattern
interface AgentConfig {
  name: string;
  model: string;
  description: string;
  instruction: string;
}

class Agent {
  private genAI: GoogleGenerativeAI;
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.config = config;
  }

  async generate(userPrompt?: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: this.config.model,
      systemInstruction: this.config.instruction,
    });

    const prompt = userPrompt || "Generate the response based on your instructions.";

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  }
}

/**
 * Creates a Course Welcome Agent that generates personalized welcome messages
 * using Gemini LLM
 */
export function createCourseWelcomeAgent(context: CourseContext): Agent {
  const systemPrompt = getCourseWelcomePrompt(context);

  return new Agent({
    name: "course_welcome_agent",
    model: "gemini-2.0-flash",
    description: "Agent for generating personalized course welcome messages and summaries.",
    instruction: systemPrompt,
  });
}

/**
 * Creates an agent for returning students
 */
export function createReturningStudentAgent(context: CourseContext & {
  lastLesson?: string;
  progress?: number;
}): Agent {
  const systemPrompt = getReturningStudentPrompt(context);

  return new Agent({
    name: "returning_student_agent",
    model: "gemini-2.0-flash",
    description: "Agent for welcoming returning students and helping them continue their journey.",
    instruction: systemPrompt,
  });
}

/**
 * Generate a course welcome summary using the agent
 */
export async function generateCourseSummary(context: CourseContext): Promise<string> {
  try {
    const agent = createCourseWelcomeAgent(context);
    const summary = await agent.generate();
    return summary.trim();
  } catch (error) {
    console.error("Error generating course summary:", error);
    // Fallback to a default message if LLM fails
    return `This course will guide you through ${context.courseTitle}, helping you develop practical skills and knowledge that you can apply in real-world scenarios.`;
  }
}

/**
 * Generate a welcome back message for returning students
 */
export async function generateWelcomeBackMessage(context: CourseContext & {
  lastLesson?: string;
  progress?: number;
}): Promise<string> {
  try {
    const agent = createReturningStudentAgent(context);
    const message = await agent.generate();
    return message.trim();
  } catch (error) {
    console.error("Error generating welcome back message:", error);
    return `Welcome back! Ready to continue your journey with ${context.courseTitle}?`;
  }
}
