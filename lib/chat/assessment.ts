/**
 * Utilities for parsing and handling formative assessment content
 */

export interface ParsedQuestion {
  questionNumber: number;
  questionText: string;
  options?: string[];
  isMultipleChoice: boolean;
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
    .replace(/\*\*(.+?)\*\*/g, '$1')  // Bold **text**
    .replace(/\*(.+?)\*/g, '$1')       // Italic *text*
    .replace(/^\*\*\s*/, '')           // Leading **
    .replace(/\s*\*\*$/, '')           // Trailing **
    .replace(/^\*\s*/, '')             // Leading *
    .replace(/\s*\*$/, '')             // Trailing *
    .replace(/^#+\s*/gm, '')           // Headers ###
    .replace(/^---+$/gm, '')           // Horizontal rules
    .trim();
}

/**
 * Normalize content by converting inline format to line-based format
 * Handles AI output that comes as a single line
 */
function normalizeContent(content: string): string {
  let normalized = content;

  // Add newlines before "Question N" patterns
  normalized = normalized.replace(/\s*(Question\s+\d+)/gi, '\n$1');

  // Add newlines before option patterns like "- A)" or "A)"
  normalized = normalized.replace(/\s*(-\s*)?([A-D])\)\s*/g, '\n$1$2) ');

  // Add newlines before "What's your answer" type phrases
  normalized = normalized.replace(/\s*(What['']?s your answer\??)/gi, '\n$1');

  // Clean up multiple newlines
  normalized = normalized.replace(/\n{3,}/g, '\n\n');

  return normalized.trim();
}

/**
 * Parses FA response content to extract questions and format them properly
 * Handles both line-based and inline formats from AI
 */
export function parseAssessmentContent(content: string): ParsedAssessment {
  // First normalize the content to handle single-line AI output
  const normalizedContent = normalizeContent(content);
  const lines = normalizedContent.split('\n');
  const questions: ParsedQuestion[] = [];
  const otherContent: string[] = [];
  let introText = '';
  let currentQuestion: ParsedQuestion | null = null;
  let isInQuestion = false;
  let isInIntro = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check if this line starts a new question
    // Match patterns like "Question 1:", "Question 1 (Multiple Choice):", etc.
    const questionMatch = line.match(/^Question\s+(\d+)\s*(?:\([^)]+\))?[:\s]*(.*)$/i);
    if (questionMatch) {
      // Save the previous question if it exists
      if (currentQuestion && currentQuestion.questionText) {
        questions.push(currentQuestion);
      }

      isInQuestion = true;
      isInIntro = false;

      // The question text might be on the same line after the colon
      let questionText = stripMarkdown(questionMatch[2] || '');

      // If no text on same line, look for it in the next non-option lines
      if (!questionText) {
        let j = i + 1;
        while (j < lines.length) {
          const nextLine = lines[j].trim();
          if (!nextLine) {
            j++;
            continue;
          }
          // Stop if we hit an option or another question
          if (nextLine.match(/^(-\s*)?[A-D]\)\s*/) || nextLine.match(/^Question\s+\d+/i)) {
            break;
          }
          // Skip lines that are just markdown artifacts
          if (nextLine.match(/^[\*#\-]+\s*$/) || nextLine === '**') {
            j++;
            continue;
          }
          questionText = stripMarkdown(nextLine);
          break;
        }
      }

      currentQuestion = {
        questionNumber: parseInt(questionMatch[1]),
        questionText: questionText,
        options: [],
        isMultipleChoice: false,
        rawText: line
      };

      continue;
    }

    // Check if this line is a multiple choice option
    // Match patterns like "A) text", "- A) text", "A. text"
    const optionMatch = line.match(/^(-\s*)?([A-D])[\)\.]\s*(.+)$/i);
    if (optionMatch && currentQuestion) {
      const optionLetter = optionMatch[2].toUpperCase();
      const optionText = optionMatch[3].trim();
      currentQuestion.options = currentQuestion.options || [];
      currentQuestion.options.push(`${optionLetter}) ${optionText}`);
      currentQuestion.isMultipleChoice = true;
      continue;
    }

    // Check if this is asking for an answer (ends the current question)
    if (line.toLowerCase().includes("what's your answer") ||
        line.toLowerCase().includes("what is your answer") ||
        line.toLowerCase().includes("your answer")) {
      if (currentQuestion && currentQuestion.questionText) {
        questions.push(currentQuestion);
        currentQuestion = null;
        isInQuestion = false;
      }
      continue;
    }

    // If we're in a question and this looks like question text (not an option)
    if (isInQuestion && currentQuestion && !line.match(/^(-\s*)?[A-D][\)\.]/i)) {
      // Skip markdown-only lines
      if (line.match(/^[\*#\-]+\s*$/) || line === '**') {
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
      if (line === '---') {
        isInIntro = false;
        continue;
      }
      if (introText) {
        introText += ' ' + line;
      } else {
        introText = line;
      }
      continue;
    }

    // Handle other content - skip markdown artifacts
    if (!isInQuestion && !isInIntro && line && line !== '---') {
      // Skip lines that are just markdown formatting
      if (!line.match(/^[\*#\-]+\s*$/) && line !== '**' && !line.match(/^#+\s*\*+\s*$/)) {
        otherContent.push(stripMarkdown(line));
      }
    }
  }

  // Don't forget to add the last question
  if (currentQuestion && currentQuestion.questionText) {
    questions.push(currentQuestion);
  }

  // Filter out empty strings from otherContent
  const filteredOtherContent = otherContent.filter(text => text.trim().length > 0);

  return {
    introText: stripMarkdown(introText.trim()),
    questions,
    otherContent: filteredOtherContent
  };
}

/**
 * Checks if the content contains assessment questions
 */
export function isAssessmentContent(content: string): boolean {
  return /Question\s+\d+.*?:/i.test(content) || content.toLowerCase().includes('quiz');
}