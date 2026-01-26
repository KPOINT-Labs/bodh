/**
 * Welcome Message Prompts - Exact port from BODH agent.py
 *
 * Source: /home/aditya/kpoint/prism2/app/agents/livekit/bodh/agent.py
 * Lines 163-412
 */

export type SessionType =
  | "course_welcome"
  | "course_welcome_back"
  | "lesson_welcome"
  | "lesson_welcome_back";

/**
 * Build prompt for COURSE WELCOME message.
 * Used when: First time user enters the course (on intro lesson).
 *
 * Based on PRD:
 * "Welcome to the Course Computational Thinking! This course teaches you
 * how to organize your thinking so you can break problems into clear,
 * step-by-step solutions. Let's start with the course introduction."
 *
 * Port of agent.py _get_course_welcome_prompt (lines 173-234)
 */
export function getCourseWelcomePrompt(
  courseTitle: string,
  learningObjectives: string | null,
  courseDescription: string | null = null
): string {
  let objectivesText = "";
  if (learningObjectives) {
    const objectivesList = learningObjectives
      .split(",")
      .map((obj) => obj.trim())
      .filter(Boolean);
    if (objectivesList.length > 0) {
      objectivesText =
        "\nLearning Objectives (USE THESE for the bullet points):\n" +
        objectivesList.map((obj, i) => `${i + 1}. ${obj}`).join("\n");
    }
  }

  let descriptionText = "";
  if (courseDescription) {
    descriptionText = `\nCourse Description: ${courseDescription}`;
  }

  return `You are a friendly and encouraging AI learning assistant helping students begin their educational journey.

Your task is to generate a structured welcome message for a student who just started a course.

Course Information:
- Course Title: ${courseTitle}${descriptionText}${objectivesText}

IMPORTANT: Follow this EXACT format structure:

1. Start with a brief intro sentence (1-2 sentences) explaining what the course teaches
2. Add "You'll learn:" on a new line
3. List 3 key learning points as bullet points using "•" character, each on a new line
4. End with "Let's start with the course introduction."

Example format:
This course teaches you [what it teaches]. [Additional context about the foundation/skills].

You'll learn:
• [First key learning point]
• [Second key learning point]
• [Third key learning point]

Let's start with the course introduction.

Guidelines:
- Do NOT include "Welcome to [Course Name]!" - that's added separately
- Do NOT use markdown formatting (no **, ##, etc.) - only use • for bullets
- Keep each bullet point concise (under 15 words)
- Keep the total response under 100 words
- This will be spoken aloud by TTS, so write naturally for speech
- MUST end with "Let's start with the course introduction."

Generate the welcome message following this exact structure.`;
}

/**
 * Build prompt for COURSE WELCOME BACK message.
 * Used when: Returning user enters the course.
 *
 * Port of agent.py _get_course_welcome_back_prompt (lines 237-274)
 */
export function getCourseWelcomeBackPrompt(
  courseTitle: string,
  completedLessons: number | null = null,
  totalLessons: number | null = null,
  lastLessonTitle: string | null = null
): string {
  let progressText = "";
  if (completedLessons !== null && totalLessons !== null) {
    progressText = `\nProgress: ${completedLessons}/${totalLessons} lessons completed`;
  }

  let lastLessonText = "";
  if (lastLessonTitle) {
    lastLessonText = `\nLast Lesson: ${lastLessonTitle}`;
  }

  return `You are a friendly AI learning assistant welcoming back a returning student.

Course: ${courseTitle}${progressText}${lastLessonText}

Guidelines:
1. Welcome the student back warmly
2. Briefly mention their progress if available
3. Remind them where they left off (last lesson)
4. Encourage them to continue
5. Keep it concise (2-3 sentences max, under 50 words)
6. Do NOT use markdown formatting
7. This will be spoken aloud by TTS, so write naturally for speech

Example:
"Welcome back! You've completed 3 out of 10 lessons. You were working on Lesson 4: Iteration. Ready to continue?"

Generate a personalized welcome back message.`;
}

/**
 * Build prompt for LESSON WELCOME message.
 * Used when: First time user enters a lesson (lesson 2+, not intro).
 * Offers warm-up from previous lesson.
 *
 * Based on PRD:
 * "Before Lesson 2, let's do a quick warm-up from Lesson 1: Datasets.
 * Just 3 questions. It'll take 30 seconds."
 *
 * Port of agent.py _get_lesson_welcome_prompt (lines 276-312)
 */
export function getLessonWelcomePrompt(
  lessonNumber: number,
  lessonTitle: string,
  prevLessonTitle: string | null = null
): string {
  let prevLessonText = "";
  if (prevLessonTitle) {
    prevLessonText = ` from ${prevLessonTitle}`;
  }

  return `You are a friendly AI learning assistant helping a student start a new lesson.

Current Lesson: Lesson ${lessonNumber}: ${lessonTitle}
Previous Lesson: ${prevLessonTitle || "N/A"}

Your task: Generate a brief message offering a warm-up quiz from the previous lesson.

IMPORTANT: Generate EXACTLY this format (fill in the blanks):

"Before Lesson ${lessonNumber}, let's do a quick warm-up${prevLessonText}.
Just 3 questions. It'll take 30 seconds."

Guidelines:
- Keep it exactly 2 sentences
- Mention it's quick (30 seconds, 3 questions)
- Do NOT use markdown formatting
- This will be spoken aloud by TTS, so write naturally
- Do NOT actually ask questions yet - just offer the warm-up

Generate the lesson welcome message.`;
}

/**
 * Get progress tier based on completion percentage.
 * Returns tier name, tone guidance, and example phrases.
 *
 * Port of agent.py _get_progress_tier (lines 314-351)
 */
export function getProgressTier(completionPercentage: number | null): {
  tierName: string;
  toneGuidance: string;
  examplePhrases: string;
} {
  if (completionPercentage === null || completionPercentage === 0) {
    return {
      tierName: "not_started",
      toneGuidance: "welcoming and inviting",
      examplePhrases: "let's begin, ready to start, let's dive in",
    };
  } else if (completionPercentage >= 100) {
    return {
      tierName: "completed",
      toneGuidance: "celebratory and supportive",
      examplePhrases: "you've finished, well done, completed the lesson",
    };
  } else if (completionPercentage <= 15) {
    return {
      tierName: "early",
      toneGuidance: "warm and encouraging",
      examplePhrases: "just getting started, great beginning, keep going",
    };
  } else if (completionPercentage <= 50) {
    return {
      tierName: "in_progress",
      toneGuidance: "supportive and steady",
      examplePhrases: "making progress, on your way, good work so far",
    };
  } else if (completionPercentage <= 85) {
    return {
      tierName: "past_halfway",
      toneGuidance: "celebratory and momentum-focused",
      examplePhrases: "more than halfway, great progress, impressive",
    };
  } else {
    // 86-99%
    return {
      tierName: "almost_done",
      toneGuidance: "exciting and finish-line focused",
      examplePhrases: "almost there, so close, let's finish strong",
    };
  }
}

/**
 * Build prompt for LESSON WELCOME BACK message.
 * Used when: Returning user comes back to a lesson they already started.
 *
 * Based on PRD: "Let's continue where you left off"
 *
 * Port of agent.py _get_lesson_welcome_back_prompt (lines 354-412)
 */
export function getLessonWelcomeBackPrompt(
  lessonTitle: string,
  completionPercentage: number | null = null,
  lastPosition: number | null = null
): string {
  let progressText = "";
  if (completionPercentage !== null) {
    progressText = `\nProgress: ${Math.round(completionPercentage)}% complete`;
  }

  let positionText = "";
  if (lastPosition !== null && lastPosition > 0) {
    const minutes = Math.floor(lastPosition / 60);
    const seconds = lastPosition % 60;
    positionText = `\nLast Position: ${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  // Get tier-specific tone guidance
  const { tierName, toneGuidance, examplePhrases } = getProgressTier(completionPercentage);

  // Tier-specific example messages
  const tierExamples: Record<string, string> = {
    not_started: '"Welcome back! Let\'s start this lesson."',
    early:
      '"Hey, welcome back! You\'ve just started this lesson. Let\'s keep going from where you left off!"',
    completed:
      '"Welcome back! You\'ve completed this lesson. I\'m here if you have any questions or want to discuss what you learned."',
    in_progress:
      '"Welcome back! You\'re making good progress. Ready to continue where you left off?"',
    past_halfway:
      '"Great to see you back! You\'re already more than halfway through. Let\'s keep that momentum going!"',
    almost_done:
      '"Welcome back! You\'re so close to finishing! Let\'s wrap this up!"',
  };
  const exampleMessage = tierExamples[tierName] || tierExamples["in_progress"];

  return `You are a friendly AI learning assistant welcoming back a student to continue a lesson.

Lesson: ${lessonTitle}${progressText}${positionText}

TONE GUIDANCE:
- Progress tier: ${tierName}
- Your tone should be: ${toneGuidance}
- Use phrases like: ${examplePhrases}

Guidelines:
1. Welcome them back briefly
2. Mention where they left off (progress %)
3. Offer to continue from that point
4. Keep it very concise (1-2 sentences, under 30 words)
5. Do NOT use markdown formatting
6. This will be spoken aloud by TTS
7. Match the tone guidance above based on their progress

Example for this tier:
${exampleMessage}

Generate the lesson welcome back message.`;
}

// ============================================================================
// FALLBACK MESSAGES
// Port of agent.py _build_fallback_* functions (lines 763-814)
// ============================================================================

export function getFallbackCourseWelcome(
  base: string,
  courseTitle: string
): string {
  return `${base}Welcome to ${courseTitle}! I'm Aditi, your AI learning companion. Let's start with the course introduction. Feel free to ask me any questions!`;
}

export function getFallbackCourseWelcomeBack(
  base: string,
  courseTitle: string,
  completedLessons?: number,
  totalLessons?: number,
  lastLessonTitle?: string
): string {
  let progressPart = "";
  if (completedLessons !== undefined && totalLessons !== undefined) {
    progressPart = ` You've completed ${completedLessons} of ${totalLessons} lessons.`;
  }
  let lastPart = "";
  if (lastLessonTitle) {
    lastPart = ` You were on ${lastLessonTitle}.`;
  }
  return `${base}Welcome back to ${courseTitle}!${progressPart}${lastPart} Ready to continue?`;
}

export function getFallbackLessonWelcome(
  base: string,
  lessonNumber: number,
  prevLessonTitle: string | null
): string {
  const prev = prevLessonTitle ? ` from ${prevLessonTitle}` : "";
  return `${base}Before Lesson ${lessonNumber}, let's do a quick warm-up${prev}. Just 3 questions. It'll take 30 seconds.`;
}

export function getFallbackLessonWelcomeBack(
  base: string,
  _lessonTitle: string,
  completionPercentage: number | null
): string {
  const { tierName } = getProgressTier(completionPercentage);
  const pct = completionPercentage ?? 0;

  const tierFallbacks: Record<string, string> = {
    not_started: `Welcome back! Let's start this lesson.`,
    early: `Hey, welcome back! You've just started at ${Math.round(pct)}%. Let's keep going!`,
    completed: `Welcome back! You've completed this lesson. I'm here if you have any questions or want to discuss what you learned.`,
    in_progress: `Welcome back! You're making good progress at ${Math.round(pct)}%. Ready to continue?`,
    past_halfway: `Great to see you back! You're already more than halfway through at ${Math.round(pct)}%. Let's keep that momentum going!`,
    almost_done: `Welcome back! You're so close to finishing at ${Math.round(pct)}%! Let's wrap this up!`,
  };

  return `${base}${tierFallbacks[tierName] || tierFallbacks["in_progress"]}`;
}
