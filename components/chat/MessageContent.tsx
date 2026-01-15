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
  onQuestionSkip?: (questionNumber: number) => void;
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
export function MessageContent({ content, messageType, role, onQuestionAnswer, onQuestionSkip, onTimestampClick, isFromHistory = false }: MessageContentProps) {
  // Check if this is an FA assistant message with feedback (correct/incorrect response)
  // Only show feedback badge for assistant messages, not user answers
  if (messageType === "fa" && role === "assistant") {
    const feedback = detectAnswerFeedback(content);
    const hasQuestions = isAssessmentContent(content);

    // If it's feedback only (no new questions), show feedback badge with explanation
    if (feedback.type && !hasQuestions) {
      const lines = content.split('\n').filter(line => line.trim());
      const feedbackLine = lines[0] || '';
      const restLines = lines.slice(1);

      return (
        <div className="space-y-3">
          {/* Feedback Badge - only show for new messages, not history */}
          {!isFromHistory && (feedback.type === 'correct' || feedback.type === 'incorrect') && (
            <FeedbackBadge type={feedback.type} />
          )}

          {/* Feedback line in bold/colored */}
          {feedbackLine && (
            <p className={`text-sm font-bold ${feedback.type === 'correct' ? 'text-emerald-600' : 'text-red-600'}`}>
              {parseInlineMarkdownWithTimestamps(feedbackLine, onTimestampClick)}
            </p>
          )}

          {/* Rest of explanation in normal text */}
          {restLines.length > 0 && (
            <div className="text-sm leading-relaxed text-gray-700">
              {restLines.map((line, idx) => (
                <p key={idx} className={idx > 0 ? "mt-2" : ""}>
                  {parseInlineMarkdownWithTimestamps(line, onTimestampClick)}
                </p>
              ))}
            </div>
          )}
        </div>
      );
    }

    // If it has questions (with or without feedback)
    if (hasQuestions) {
      const parsed = parseAssessmentContent(content);

      // Extract feedback line from original content (first non-empty line)
      const contentLines = content.split('\n').filter(line => line.trim());
      const feedbackLine = feedback.type ? contentLines[0] : null;

      return (
        <div className="space-y-4">
          {/* Show feedback badge if this response contains feedback + next question - only for new messages */}
          {!isFromHistory && (feedback.type === 'correct' || feedback.type === 'incorrect') && (
            <FeedbackBadge type={feedback.type} />
          )}

          {/* Show feedback line in bold/colored */}
          {feedbackLine && (
            <p className={`text-sm font-bold ${feedback.type === 'correct' ? 'text-emerald-600' : 'text-red-600'}`}>
              {parseInlineMarkdownWithTimestamps(feedbackLine, onTimestampClick)}
            </p>
          )}

          {/* Render intro/feedback text - exclude the feedback line we already showed */}
          {parsed.introText && (() => {
            // Remove the feedback line from intro text if it's there
            let displayIntro = parsed.introText;
            if (feedbackLine) {
              // The intro text might start with the feedback line (stripped of markdown)
              const strippedFeedback = feedbackLine.replace(/\*\*/g, '').trim();
              if (displayIntro.startsWith(strippedFeedback)) {
                displayIntro = displayIntro.slice(strippedFeedback.length).trim();
              }
            }
            return displayIntro ? (
              <div className="text-sm leading-relaxed text-gray-700">
                {parseInlineMarkdownWithTimestamps(displayIntro, onTimestampClick)}
              </div>
            ) : null;
          })()}

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
              onSkip={() => onQuestionSkip?.(question.questionNumber)}
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
