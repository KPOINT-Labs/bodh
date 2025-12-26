/**
 * Prompt templates for various agents
 */

export interface CourseContext {
  courseTitle: string;
  courseDescription?: string | null;
  learningObjectives?: string[];
  moduleTitle?: string;
  lessonTitle?: string;
  lessonNumber?: number;
}

export function getCourseWelcomePrompt(context: CourseContext): string {
  const hasObjectives = context.learningObjectives && context.learningObjectives.length > 0;

  const objectivesText = hasObjectives
    ? `\nLearning Objectives (USE THESE for the bullet points):\n${context.learningObjectives!.map((obj, i) => `${i + 1}. ${obj}`).join("\n")}`
    : "";

  const descriptionText = context.courseDescription
    ? `\nCourse Description: ${context.courseDescription}`
    : "";

  return `You are a friendly and encouraging AI learning assistant helping students begin their educational journey.

Your task is to generate a structured welcome message for a student who just started a course.

Course Information:
- Course Title: ${context.courseTitle}${descriptionText}${objectivesText}

IMPORTANT: Follow this EXACT format structure:

1. Start with a brief intro sentence (1-2 sentences) explaining what the course helps them achieve
2. Add "You'll learn:" on a new line
3. List 3 key learning points as bullet points using "•" character, each on a new line
4. End with a relatable analogy (like "Think of it like..." or similar)

Example format:
This course helps you [benefit]. [Additional context about the foundation/skills].

You'll learn:
• [First key learning point]
• [Second key learning point]
• [Third key learning point]

Think of it like [relatable analogy] — [brief explanation].

Guidelines:
- Do NOT include "Welcome to [Course Name]!" - that's added separately
- Do NOT use markdown formatting (no **, ##, etc.) - only use • for bullets
- Keep each bullet point concise (under 15 words)
- Make the analogy relatable to everyday life
- Keep the total response under 120 words

Generate the welcome message following this exact structure.`;
}

export function getReturningStudentPrompt(context: CourseContext & {
  lastLesson?: string;
  progress?: number;
}): string {
  return `You are a friendly AI learning assistant welcoming back a returning student.

Course: ${context.courseTitle}
${context.lastLesson ? `Last Lesson Completed: ${context.lastLesson}` : ""}
${context.progress ? `Progress: ${context.progress}%` : ""}

Guidelines:
1. Welcome the student back warmly
2. Briefly remind them where they left off
3. Encourage them to continue their learning journey
4. Keep it concise (2-3 sentences max)
5. Do NOT use markdown formatting

Generate a personalized welcome back message.`;
}
