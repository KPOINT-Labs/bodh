import {
  parseInlineMarkdownWithTimestamps,
  parseListItem,
  isLearningHeader,
  parseHeader,
  isHorizontalRule,
  hasTimestampLinks,
} from "@/lib/chat/markdown";
import { parseAssessmentContent, isAssessmentContent, detectAnswerFeedback } from "@/lib/chat/assessment";
import { AssessmentQuestion } from "./AssessmentQuestion";
import { FeedbackBadge } from "./FeedbackBadge";

interface MessageContentProps {
  content: string;
  messageType?: string;
  role?: "user" | "assistant" | "system";
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
export function MessageContent({ content, messageType, role, onQuestionAnswer, onTimestampClick, isFromHistory = false }: MessageContentProps) {
  // Check if this is an FA assistant message with feedback (correct/incorrect response)
  // Only show feedback badge for assistant messages, not user answers
  if (messageType === "fa" && role === "assistant") {
    const feedback = detectAnswerFeedback(content);
    const hasQuestions = isAssessmentContent(content);

    // If it's feedback only (no new questions), show feedback badge with explanation
    if (feedback.type && !hasQuestions) {
      return (
        <div className="space-y-3">
          {/* Feedback Badge - only show for new messages, not history */}
          {!isFromHistory && (feedback.type === 'correct' || feedback.type === 'incorrect') && (
            <FeedbackBadge type={feedback.type} />
          )}

          {/* Explanation text */}
          <div className="text-sm leading-relaxed text-gray-700">
            {content.split('\n').map((line, idx) => (
              line.trim() ? (
                <p key={idx} className={idx > 0 ? "mt-2" : ""}>
                  {parseInlineMarkdownWithTimestamps(line, onTimestampClick)}
                </p>
              ) : null
            ))}
          </div>
        </div>
      );
    }

    // If it has questions (with or without feedback)
    if (hasQuestions) {
      const parsed = parseAssessmentContent(content);

      return (
        <div className="space-y-4">
          {/* Show feedback badge if this response contains feedback + next question - only for new messages */}
          {!isFromHistory && (feedback.type === 'correct' || feedback.type === 'incorrect') && (
            <FeedbackBadge type={feedback.type} />
          )}

          {/* Render intro/feedback text - show the full explanation */}
          {parsed.introText && (
            <div className="text-sm leading-relaxed text-gray-700">
              {parsed.introText.split('\n').map((line, idx) => (
                line.trim() ? <p key={idx} className={idx > 0 ? "mt-2" : ""}>{parseInlineMarkdownWithTimestamps(line, onTimestampClick)}</p> : null
              ))}
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
        </div>
      );
    }
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

        // Check for list items (numbered or bullet)
        const listItem = parseListItem(line);
        if (listItem) {
          if (listItem.type === "numbered") {
            // Numbered list item (1., 2., etc.)
            return (
              <div key={index} className="flex items-start gap-2 my-1">
                <span className="font-semibold text-gray-700 min-w-6">{listItem.number}.</span>
                <span>{parseInlineMarkdownWithTimestamps(listItem.content, onTimestampClick)}</span>
              </div>
            );
          } else {
            // Check if this is a video link (timestamp link) - render without bullet but aligned with bullets
            if (hasTimestampLinks(listItem.content)) {
              return (
                <div key={index} className={`my-1 ${listItem.isIndented ? "ml-10" : "ml-6"}`}>
                  {parseInlineMarkdownWithTimestamps(listItem.content, onTimestampClick)}
                </div>
              );
            }
            // Regular bullet point - indent if it has leading whitespace
            return (
              <div key={index} className={`flex items-start gap-2 my-1 ${listItem.isIndented ? "ml-6" : "ml-2"}`}>
                <span className="text-gray-600 shrink-0">•</span>
                <span>{parseInlineMarkdownWithTimestamps(listItem.content, onTimestampClick)}</span>
              </div>
            );
          }
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
