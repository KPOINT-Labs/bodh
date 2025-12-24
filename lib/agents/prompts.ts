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
  const objectivesText = context.learningObjectives?.length
    ? `\nLearning Objectives:\n${context.learningObjectives.map((obj, i) => `${i + 1}. ${obj}`).join("\n")}`
    : "";

  const descriptionText = context.courseDescription
    ? `\nCourse Description: ${context.courseDescription}`
    : "";

  return `You are a friendly and encouraging AI learning assistant helping students begin their educational journey.

Your task is to generate a warm, personalized welcome message for a student who just started a course.

Course Information:
- Course Title: ${context.courseTitle}${descriptionText}${objectivesText}

Guidelines:
1. Create a concise, engaging summary of the course (2-3 sentences max)
2. Highlight the key skills or knowledge students will gain
3. Use an encouraging, supportive tone
4. Make the content feel personal and motivating
5. Do NOT include greetings like "Welcome to..." - just provide the course summary
6. Do NOT use markdown formatting or bullet points
7. Keep the response under 100 words

Generate a compelling course summary that excites the student about what they'll learn.`;
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
