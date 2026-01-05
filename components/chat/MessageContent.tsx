import {
  parseInlineMarkdown,
  parseBulletPoint,
  isLearningHeader,
} from "@/lib/chat/markdown";
import { parseAssessmentContent, isAssessmentContent } from "@/lib/chat/assessment";
import { AssessmentQuestion } from "./AssessmentQuestion";

interface MessageContentProps {
  content: string;
  messageType?: string;
  onQuestionAnswer?: (questionNumber: number, answer: string) => void;
}

/**
 * Renders message content with markdown formatting
 * Supports:
 * - Bold text (**text**)
 * - Bullet points (•, -, 1.)
 * - Learning headers ("You'll learn:")
 * - Assessment questions (FA messages)
 */
export function MessageContent({ content, messageType, onQuestionAnswer }: MessageContentProps) {
  // Check if this is an assessment message with questions
  if (messageType === "fa" && isAssessmentContent(content)) {
    const parsed = parseAssessmentContent(content);
    
    return (
      <div className="space-y-4">
        {/* Render intro text */}
        {parsed.introText && (
          <div className="text-sm leading-relaxed">
            <p>{parseInlineMarkdown(parsed.introText)}</p>
          </div>
        )}
        
        {/* Render questions */}
        {parsed.questions.map((question) => (
          <AssessmentQuestion
            key={question.questionNumber}
            question={question.questionText}
            options={question.options}
            questionNumber={question.questionNumber}
            onAnswer={(answer) => onQuestionAnswer?.(question.questionNumber, answer)}
          />
        ))}
        
        {/* Render other content */}
        {parsed.otherContent.map((text, index) => (
          <div key={index} className="text-sm leading-relaxed">
            <p>{parseInlineMarkdown(text)}</p>
          </div>
        ))}
      </div>
    );
  }

  // Regular message content rendering
  return (
    <div className="text-sm leading-relaxed">
      {content.split("\n").map((line, index) => {
        const bulletMatch = parseBulletPoint(line);

        if (bulletMatch) {
          const bulletText = line.trim().substring(bulletMatch[0].length);
          return (
            <div key={index} className="flex items-start gap-2 ml-2 my-1">
              <span className="text-blue-500 shrink-0">{bulletMatch[1]}</span>
              <span>{parseInlineMarkdown(bulletText)}</span>
            </div>
          );
        }

        if (isLearningHeader(line)) {
          return (
            <p key={index} className="font-semibold text-gray-900 mt-3 mb-1">
              {parseInlineMarkdown(line)}
            </p>
          );
        }

        return line.trim() ? (
          <p key={index} className={index > 0 ? "mt-2" : ""}>
            {parseInlineMarkdown(line)}
          </p>
        ) : null;
      })}
    </div>
  );
}
