import {
  parseInlineMarkdownWithTimestamps,
  parseBulletPoint,
  isLearningHeader,
  parseHeader,
  isHorizontalRule,
} from "@/lib/chat/markdown";
import { parseAssessmentContent, isAssessmentContent } from "@/lib/chat/assessment";
import { AssessmentQuestion } from "./AssessmentQuestion";

interface MessageContentProps {
  content: string;
  messageType?: string;
  onQuestionAnswer?: (questionNumber: number, answer: string) => void;
  onTimestampClick?: (seconds: number, youtubeVideoId?: string | null) => void;
  isFromHistory?: boolean;
}

/**
 * Renders message content with markdown formatting
 * Supports:
 * - Bold text (**text**)
 * - Bullet points (•, -, 1.)
 * - Learning headers ("You'll learn:")
 * - Assessment questions (FA messages)
 */
export function MessageContent({ content, messageType, onQuestionAnswer, onTimestampClick, isFromHistory = false }: MessageContentProps) {
  // Check if this is an assessment message with questions
  if (messageType === "fa" && isAssessmentContent(content)) {
    const parsed = parseAssessmentContent(content);
    
    return (
      <div className="space-y-4">
        {/* Render intro text */}
        {parsed.introText && (
          <div className="text-sm leading-relaxed">
            <p>{parseInlineMarkdownWithTimestamps(parsed.introText, onTimestampClick)}</p>
          </div>
        )}

        {/* Render questions */}
        {parsed.questions.map((question) => (
          <AssessmentQuestion
            key={question.questionNumber}
            question={question.questionText}
            options={question.options}
            questionNumber={question.questionNumber}
            answerType={question.answerType}
            placeholder={question.placeholder}
            onAnswer={(answer) => onQuestionAnswer?.(question.questionNumber, answer)}
            isFromHistory={isFromHistory}
          />
        ))}

        {/* Render other content */}
        {parsed.otherContent.map((text, index) => (
          <div key={index} className="text-sm leading-relaxed">
            <p>{parseInlineMarkdownWithTimestamps(text, onTimestampClick)}</p>
          </div>
        ))}
      </div>
    );
  }

  // Regular message content rendering
  return (
    <div className="text-sm leading-relaxed">
      {content.split("\n").map((line, index) => {
        // Check for horizontal rule first (---, ***, ___)
        if (isHorizontalRule(line)) {
          return <hr key={index} className="my-3 border-gray-200" />;
        }

        // Check for markdown headers (# ## ### etc.)
        const headerMatch = parseHeader(line);
        if (headerMatch) {
          const headerStyles: Record<number, string> = {
            1: "text-lg font-bold text-gray-900 mt-4 mb-2",
            2: "text-base font-bold text-gray-900 mt-3 mb-2",
            3: "text-sm font-semibold text-gray-900 mt-3 mb-1",
            4: "text-sm font-semibold text-gray-800 mt-2 mb-1",
            5: "text-sm font-medium text-gray-800 mt-2 mb-1",
            6: "text-sm font-medium text-gray-700 mt-2 mb-1",
          };
          return (
            <p key={index} className={headerStyles[headerMatch.level]}>
              {parseInlineMarkdownWithTimestamps(headerMatch.text, onTimestampClick)}
            </p>
          );
        }

        // Check for bullet points
        const bulletMatch = parseBulletPoint(line);
        if (bulletMatch) {
          const bulletText = bulletMatch[2] || line.trim().substring(bulletMatch[0].length);
          return (
            <div key={index} className="flex items-start gap-2 ml-2 my-1">
              <span className="text-blue-500 shrink-0">•</span>
              <span>{parseInlineMarkdownWithTimestamps(bulletText, onTimestampClick)}</span>
            </div>
          );
        }

        if (isLearningHeader(line)) {
          return (
            <p key={index} className="font-semibold text-gray-900 mt-3 mb-1">
              {parseInlineMarkdownWithTimestamps(line, onTimestampClick)}
            </p>
          );
        }

        return line.trim() ? (
          <p key={index} className={index > 0 ? "mt-2" : ""}>
            {parseInlineMarkdownWithTimestamps(line, onTimestampClick)}
          </p>
        ) : null;
      })}
    </div>
  );
}
