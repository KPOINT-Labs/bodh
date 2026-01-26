/**
 * Utilities for parsing and handling formative assessment content
 */

export interface ParsedQuestion {
  questionNumber: number;
  questionText: string;
  options?: string[];
  isMultipleChoice: boolean;
  answerType: "multiple_choice" | "short_answer" | "numerical" | "long_answer";
  placeholder?: string;
  rawText: string;
}

export interface ParsedAssessment {
  introText: string;
  questions: ParsedQuestion[];
  otherContent: string[];
}

/**
 * Strip markdown formatting from text
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1") // Bold **text**
    .replace(/\*(.+?)\*/g, "$1") // Italic *text*
    .replace(/^\*\*\s*/, "") // Leading **
    .replace(/\s*\*\*$/, "") // Trailing **
    .replace(/^\*\s*/, "") // Leading *
    .replace(/\s*\*$/, "") // Trailing *
    .replace(/^#+\s*/gm, "") // Headers ###
    .replace(/^---+$/gm, "") // Horizontal rules
    .trim();
}

/**
 * Detects the answer type based on question content and type indicators
 */
function detectAnswerType(
  questionText: string,
  hasOptions: boolean
): {
  answerType: "multiple_choice" | "short_answer" | "numerical" | "long_answer";
  placeholder?: string;
} {
  const lowerText = questionText.toLowerCase();

  // If has options, it's multiple choice
  if (hasOptions) {
    return { answerType: "multiple_choice" };
  }

  // Check for numerical indicators
  const numericalIndicators = [
    "calculate",
    "compute",
    "how many",
    "how much",
    "what number",
    "percentage",
    "percent",
    "ratio",
    "value",
    "result",
    "answer in numbers",
    "numeric",
    "numerical",
    "digit",
    "integer",
    "decimal",
    "formula",
  ];

  if (numericalIndicators.some((indicator) => lowerText.includes(indicator))) {
    return {
      answerType: "numerical",
      placeholder: "Enter a number...",
    };
  }

  // Check for long answer indicators
  const longAnswerIndicators = [
    "explain",
    "describe",
    "discuss",
    "elaborate",
    "analyze",
    "compare",
    "contrast",
    "justify",
    "argue",
    "why do you think",
    "in your opinion",
    "what are the reasons",
    "provide an example",
    "give an example",
    "write a paragraph",
    "essay",
    "detailed",
    "comprehensive",
  ];

  if (longAnswerIndicators.some((indicator) => lowerText.includes(indicator))) {
    return {
      answerType: "long_answer",
      placeholder: "Type your detailed answer here...",
    };
  }

  // Default to short answer
  return {
    answerType: "short_answer",
    placeholder: "Type your answer here...",
  };
}

/**
 * Normalize content by converting inline format to line-based format
 * Handles AI output that comes as a single line
 */
function normalizeContent(content: string): string {
  let normalized = content;

  // Add newlines before "Question N" patterns
  normalized = normalized.replace(/\s*(Question\s+\d+)/gi, "\n$1");

  // Add newlines before option patterns like "- A)" or "A)"
  normalized = normalized.replace(/\s*(-\s*)?([A-D])\)\s*/g, "\n$1$2) ");

  // Add newlines before "What's your answer" type phrases
  normalized = normalized.replace(/\s*(What['']?s your answer\??)/gi, "\n$1");

  // Clean up multiple newlines
  normalized = normalized.replace(/\n{3,}/g, "\n\n");

  return normalized.trim();
}

/**
 * Parses FA response content to extract questions and format them properly
 * Handles both line-based and inline formats from AI
 */
export function parseAssessmentContent(content: string): ParsedAssessment {
  // First normalize the content to handle single-line AI output
  const normalizedContent = normalizeContent(content);
  const lines = normalizedContent.split("\n");
  const questions: ParsedQuestion[] = [];
  const otherContent: string[] = [];
  let introText = "";
  let currentQuestion: ParsedQuestion | null = null;
  let isInQuestion = false;
  let isInIntro = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      continue;
    }

    // Check if this line starts a new question
    // Match patterns like "Question 1:", "Question 1 (Multiple Choice):", etc.
    const questionMatch = line.match(
      /^Question\s+(\d+)\s*(?:\([^)]+\))?[:\s]*(.*)$/i
    );
    if (questionMatch) {
      // Save the previous question if it exists
      if (currentQuestion?.questionText) {
        // Finalize answer type before pushing
        const answerTypeInfo = detectAnswerType(
          currentQuestion.questionText,
          currentQuestion.isMultipleChoice
        );
        currentQuestion.answerType = answerTypeInfo.answerType;
        currentQuestion.placeholder = answerTypeInfo.placeholder;

        questions.push(currentQuestion);
      }

      isInQuestion = true;
      isInIntro = false;

      // The question text might be on the same line after the colon
      let questionText = stripMarkdown(questionMatch[2] || "");

      // If no text on same line, look for it in the next non-option lines
      // Accumulate all lines until we hit options or another question
      if (!questionText) {
        let j = i + 1;
        const questionLines: string[] = [];
        while (j < lines.length) {
          const nextLine = lines[j].trim();
          if (!nextLine) {
            j++;
            continue;
          }
          // Stop if we hit an option or another question
          if (
            nextLine.match(/^(-\s*)?[A-D]\)\s*/) ||
            nextLine.match(/^Question\s+\d+/i)
          ) {
            break;
          }
          // Stop if we hit "What's your answer" type prompt
          if (
            nextLine.toLowerCase().includes("what's your answer") ||
            nextLine.toLowerCase().includes("what is your answer") ||
            nextLine.toLowerCase().includes("your answer")
          ) {
            break;
          }
          // Skip lines that are just markdown artifacts
          if (nextLine.match(/^[*#-]+\s*$/) || nextLine === "**") {
            j++;
            continue;
          }
          questionLines.push(stripMarkdown(nextLine));
          j++;
        }
        // Join all question lines into the question text
        questionText = questionLines.join(" ").trim();
      }

      currentQuestion = {
        questionNumber: Number.parseInt(questionMatch[1], 10),
        questionText,
        options: [],
        isMultipleChoice: false,
        answerType: "short_answer", // Will be updated later based on options
        rawText: line,
      };

      continue;
    }

    // Check if this line is a multiple choice option
    // Match patterns like "A) text", "- A) text", "A. text"
    const optionMatch = line.match(/^(-\s*)?([A-D])[).]\s*(.+)$/i);
    if (optionMatch && currentQuestion) {
      const optionLetter = optionMatch[2].toUpperCase();
      const optionText = optionMatch[3].trim();
      currentQuestion.options = currentQuestion.options || [];
      currentQuestion.options.push(`${optionLetter}) ${optionText}`);
      currentQuestion.isMultipleChoice = true;
      continue;
    }

    // Check if this is asking for an answer (ends the current question)
    if (
      line.toLowerCase().includes("what's your answer") ||
      line.toLowerCase().includes("what is your answer") ||
      line.toLowerCase().includes("your answer")
    ) {
      if (currentQuestion?.questionText) {
        // Finalize answer type before pushing
        const answerTypeInfo = detectAnswerType(
          currentQuestion.questionText,
          currentQuestion.isMultipleChoice
        );
        currentQuestion.answerType = answerTypeInfo.answerType;
        currentQuestion.placeholder = answerTypeInfo.placeholder;

        questions.push(currentQuestion);
        currentQuestion = null;
        isInQuestion = false;
      }
      continue;
    }

    // If we're in a question and this looks like question text (not an option)
    if (isInQuestion && currentQuestion && !line.match(/^(-\s*)?[A-D][).]/i)) {
      // Skip markdown-only lines
      if (line.match(/^[*#-]+\s*$/) || line === "**") {
        continue;
      }
      // If the question text is empty, this is it
      if (!currentQuestion.questionText) {
        currentQuestion.questionText = stripMarkdown(line);
        continue;
      }
    }

    // Handle intro text
    if (isInIntro && line) {
      // Stop intro when we see "---" separator
      if (line === "---") {
        isInIntro = false;
        continue;
      }
      if (introText) {
        introText += ` ${line}`;
      } else {
        introText = line;
      }
      continue;
    }

    // Handle other content - skip markdown artifacts
    if (!(isInQuestion || isInIntro) && line && line !== "---") {
      // Skip lines that are just markdown formatting
      if (
        !line.match(/^[*#-]+\s*$/) &&
        line !== "**" &&
        !line.match(/^#+\s*\*+\s*$/)
      ) {
        otherContent.push(stripMarkdown(line));
      }
    }
  }

  // Don't forget to add the last question
  if (currentQuestion?.questionText) {
    // Finalize answer type before pushing
    const answerTypeInfo = detectAnswerType(
      currentQuestion.questionText,
      currentQuestion.isMultipleChoice
    );
    currentQuestion.answerType = answerTypeInfo.answerType;
    currentQuestion.placeholder = answerTypeInfo.placeholder;

    questions.push(currentQuestion);
  }

  // Filter out empty strings from otherContent
  const filteredOtherContent = otherContent.filter(
    (text) => text.trim().length > 0
  );

  return {
    introText: stripMarkdown(introText.trim()),
    questions,
    otherContent: filteredOtherContent,
  };
}

/**
 * Checks if the content contains assessment questions
 * Matches formats like "Question 1:", "Question 1", "[QUESTION 1]", etc.
 */
export function isAssessmentContent(content: string): boolean {
  // Match marker-based format [QUESTION N]
  if (/\[QUESTION\s*\d+\]/i.test(content)) {
    return true;
  }

  // Match "Question N" with optional type indicator and optional colon
  return (
    /Question\s+\d+/i.test(content) || content.toLowerCase().includes("quiz")
  );
}

export interface FeedbackResult {
  type: "correct" | "incorrect" | "partial" | null;
  feedbackText: string;
  explanation: string;
}

/**
 * Detects if the content contains feedback about a correct or incorrect answer
 * First checks for [CORRECT]/[INCORRECT] markers, then falls back to keyword detection
 */
export function detectAnswerFeedback(content: string): FeedbackResult {
  // Check for markers first (most reliable)
  const hasCorrectMarker = /\[CORRECT\]/i.test(content);
  const hasIncorrectMarker = /\[INCORRECT\]/i.test(content);

  if (hasCorrectMarker && !hasIncorrectMarker) {
    return {
      type: "correct",
      feedbackText: "Awesome!",
      explanation: content,
    };
  }

  if (hasIncorrectMarker && !hasCorrectMarker) {
    return {
      type: "incorrect",
      feedbackText: "Not quite right",
      explanation: content,
    };
  }

  // If both markers present, check which comes first
  if (hasCorrectMarker && hasIncorrectMarker) {
    const correctIndex = content.search(/\[CORRECT\]/i);
    const incorrectIndex = content.search(/\[INCORRECT\]/i);

    if (correctIndex < incorrectIndex) {
      return {
        type: "correct",
        feedbackText: "Awesome!",
        explanation: content,
      };
    }
    return {
      type: "incorrect",
      feedbackText: "Not quite right",
      explanation: content,
    };
  }

  // Fallback to keyword-based detection
  const lowerContent = content.toLowerCase();

  // Correct answer patterns
  const correctPatterns = [
    "correct",
    "that's right",
    "that is right",
    "exactly",
    "well done",
    "great job",
    "perfect",
    "excellent",
    "awesome",
    "you got it",
    "absolutely right",
    "spot on",
    "right answer",
    "yes!",
    "yes,",
    "good job",
    "nice work",
    "brilliant",
    "you're correct",
  ];

  // Incorrect answer patterns
  const incorrectPatterns = [
    "incorrect",
    "that's not",
    "that is not",
    "not quite",
    "wrong",
    "not correct",
    "actually",
    "the correct answer",
    "the right answer is",
    "unfortunately",
    "close but",
    "not exactly",
    "try again",
    "the answer is",
    "should be",
    "it's actually",
  ];

  // Check for correct patterns
  const isCorrect = correctPatterns.some((pattern) => {
    const index = lowerContent.indexOf(pattern);
    // Make sure it's near the beginning (within first 200 chars) to be the main feedback
    return index !== -1 && index < 200;
  });

  // Check for incorrect patterns
  const isIncorrect = incorrectPatterns.some((pattern) => {
    const index = lowerContent.indexOf(pattern);
    return index !== -1 && index < 200;
  });

  // If both found, look at which comes first
  if (isCorrect && isIncorrect) {
    // Find first occurrence of each
    const firstCorrect = correctPatterns.reduce((min, pattern) => {
      const idx = lowerContent.indexOf(pattern);
      return idx !== -1 && idx < min ? idx : min;
    }, Number.POSITIVE_INFINITY);

    const firstIncorrect = incorrectPatterns.reduce((min, pattern) => {
      const idx = lowerContent.indexOf(pattern);
      return idx !== -1 && idx < min ? idx : min;
    }, Number.POSITIVE_INFINITY);

    if (firstCorrect < firstIncorrect) {
      return {
        type: "correct",
        feedbackText: "Awesome!",
        explanation: content,
      };
    }
    return {
      type: "incorrect",
      feedbackText: "Not quite right",
      explanation: content,
    };
  }

  if (isCorrect) {
    return {
      type: "correct",
      feedbackText: "Awesome!",
      explanation: content,
    };
  }

  if (isIncorrect) {
    return {
      type: "incorrect",
      feedbackText: "Not quite right",
      explanation: content,
    };
  }

  return {
    type: null,
    feedbackText: "",
    explanation: content,
  };
}

/**
 * Checks if content is primarily feedback (not a new question)
 */
export function isFeedbackContent(content: string): boolean {
  // Check for marker-based questions
  const hasMarkerQuestion = /\[QUESTION\s*\d+\]/i.test(content);
  const hasLegacyQuestion = /Question\s+\d+/i.test(content);
  const hasQuestion = hasMarkerQuestion || hasLegacyQuestion;

  const feedback = detectAnswerFeedback(content);

  // It's feedback if it has feedback indicators but no new questions
  return feedback.type !== null && !hasQuestion;
}

/**
 * Checks if assessment is complete based on [COMPLETE] marker
 */
export function isAssessmentComplete(content: string): boolean {
  return /\[COMPLETE\]/i.test(content);
}

/**
 * Parsed marker-based FA response
 */
export interface MarkerFAResponse {
  feedbackType: "correct" | "incorrect" | null;
  feedbackText: string | null;
  questionNumber: number | null;
  questionText: string | null;
  options: string[] | null;
  isMcq: boolean;
  isComplete: boolean;
  completionSummary: string | null;
  ttsText: string;
}

/**
 * Parse marker-based FA response content
 * Extracts [QUESTION N], [OPTION A-D], [CORRECT], [INCORRECT], [COMPLETE]
 */
export function parseMarkerFAResponse(content: string): MarkerFAResponse {
  if (!content) {
    return {
      feedbackType: null,
      feedbackText: null,
      questionNumber: null,
      questionText: null,
      options: null,
      isMcq: false,
      isComplete: false,
      completionSummary: null,
      ttsText: "",
    };
  }

  // Check for completion
  const isComplete = /\[COMPLETE\]/i.test(content);
  let completionSummary: string | null = null;
  const completeMatch = content.match(/\[COMPLETE\]\s*([\s\S]+?)(?=\[|$)/i);
  if (completeMatch) {
    completionSummary = completeMatch[1].trim();
  }

  // Extract feedback type
  let feedbackType: "correct" | "incorrect" | null = null;
  if (/\[CORRECT\]/i.test(content)) {
    feedbackType = "correct";
  } else if (/\[INCORRECT\]/i.test(content)) {
    feedbackType = "incorrect";
  }

  // Extract feedback text (text after feedback marker, before next marker)
  let feedbackText: string | null = null;
  const feedbackMatch = content.match(
    /\[(CORRECT|INCORRECT)\]\s*([\s\S]+?)(?=\[QUESTION|\[COMPLETE\]|$)/i
  );
  if (feedbackMatch) {
    feedbackText = feedbackMatch[2].trim();
  }

  // Extract question number and text
  let questionNumber: number | null = null;
  let questionText: string | null = null;
  const questionMatch = content.match(
    /\[QUESTION\s*(\d+)\]\s*([\s\S]+?)(?=\[OPTION|\[CORRECT|\[INCORRECT|\[COMPLETE\]|$)/i
  );
  if (questionMatch) {
    questionNumber = Number.parseInt(questionMatch[1], 10);
    questionText = questionMatch[2].trim();
  }

  // Extract MCQ options
  const options: string[] = [];
  const optionMatches = content.matchAll(
    /\[OPTION\s*([A-D])\]\s*([\s\S]+?)(?=\[OPTION|\[CORRECT|\[INCORRECT|\[COMPLETE\]|\[QUESTION|$)/gi
  );
  for (const match of optionMatches) {
    const letter = match[1].toUpperCase();
    const text = match[2].trim();
    options.push(`${letter}) ${text}`);
  }
  const isMcq = options.length > 0;

  // Build clean TTS text (remove markers but keep content)
  let ttsText = content;
  ttsText = ttsText.replace(/\[CORRECT\]/gi, "");
  ttsText = ttsText.replace(/\[INCORRECT\]/gi, "");
  ttsText = ttsText.replace(/\[COMPLETE\]/gi, "");
  ttsText = ttsText.replace(/\[QUESTION\s*\d+\]/gi, "");
  ttsText = ttsText.replace(/\[OPTION\s*[A-D]\]/gi, "");
  ttsText = ttsText.replace(/\s+/g, " ").trim();

  return {
    feedbackType,
    feedbackText,
    questionNumber,
    questionText,
    options: isMcq ? options : null,
    isMcq,
    isComplete,
    completionSummary,
    ttsText,
  };
}

export interface MessageData {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
  messageType?: string;
  createdAt: string | Date;
  conversationId: string;
}

export interface QuestionAttempt {
  questionNumber: number;
  questionText: string;
  userAnswer: string;
  isAttempted: boolean;
  messageId: string;
}

/**
 * Generate a stable hash for a question to track attempts across conversations
 */
function generateQuestionHash(
  questionText: string,
  questionNumber: number
): string {
  const normalizedText = questionText
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .trim();
  return `q${questionNumber}_${normalizedText.replace(/\s+/g, "_").substring(0, 50)}`;
}

/**
 * Parse messages to find answered FA questions in a conversation
 */
export function findAnsweredQuestions(
  messages: MessageData[]
): Map<string, QuestionAttempt> {
  const answeredQuestions = new Map<string, QuestionAttempt>();
  const faMessages = messages.filter((msg) => msg.messageType === "fa");

  for (let i = 0; i < faMessages.length; i++) {
    const message = faMessages[i];

    // Process assistant messages (questions)
    if (message.role === "assistant" && isAssessmentContent(message.content)) {
      const parsed = parseAssessmentContent(message.content);

      for (const question of parsed.questions) {
        const questionHash = generateQuestionHash(
          question.questionText,
          question.questionNumber
        );

        // Look for the next user message with FA type as the answer
        for (let j = i + 1; j < faMessages.length; j++) {
          const potentialAnswer = faMessages[j];

          if (
            potentialAnswer.role === "user" &&
            potentialAnswer.messageType === "fa"
          ) {
            // Check if this answer follows this question (basic heuristic)
            const timeDiff =
              new Date(potentialAnswer.createdAt).getTime() -
              new Date(message.createdAt).getTime();

            // If the answer comes within reasonable time after the question (10 minutes max)
            if (timeDiff > 0 && timeDiff < 10 * 60 * 1000) {
              answeredQuestions.set(questionHash, {
                questionNumber: question.questionNumber,
                questionText: question.questionText,
                userAnswer: potentialAnswer.content,
                isAttempted: true,
                messageId: potentialAnswer.id,
              });
              break; // Found answer for this question
            }
          }
        }
      }
    }
  }

  return answeredQuestions;
}

/**
 * Check if a specific question has been answered in the conversation
 */
export function isQuestionAnswered(
  questionText: string,
  questionNumber: number,
  answeredQuestions: Map<string, QuestionAttempt>
): QuestionAttempt | null {
  const questionHash = generateQuestionHash(questionText, questionNumber);
  return answeredQuestions.get(questionHash) || null;
}

/**
 * Get all answered questions for a conversation
 */
export async function getAnsweredQuestionsForConversation(
  conversationId: string
): Promise<Map<string, QuestionAttempt>> {
  try {
    // This would typically fetch from an API endpoint
    // For now, return empty map - will be implemented when called from components
    const response = await fetch(
      `/api/messages?conversationId=${conversationId}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch messages");
    }

    const messages: MessageData[] = await response.json();
    return findAnsweredQuestions(messages);
  } catch (error) {
    console.error("Error fetching answered questions:", error);
    return new Map();
  }
}
