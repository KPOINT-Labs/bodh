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
import { InLessonQuestion } from "./InLessonQuestion";
import type { QuizOption } from "@/types/assessment";
import {
  Heart,
  Award,
  ThumbsUp,
  Star,
  Zap,
  Smile,
  HelpCircle,
  Brain,
  BookOpen,
  Lightbulb,
  AlertCircle,
  MessageCircle,
  Sparkles,
  CheckCircle,
  Clock,
  Target,
  Coffee,
  Play
} from "lucide-react";

interface MessageContentProps {
  content: string;
  messageType?: string;
  role?: "user" | "assistant" | "system";
  onQuestionAnswer?: (questionNumber: number, answer: string) => void;
  onQuestionSkip?: (questionNumber: number) => void;
  onTimestampClick?: (seconds: number, youtubeVideoId?: string | null) => void;
  isFromHistory?: boolean;
  // In-lesson question props
  inlessonMetadata?: {
    questionId?: string;
    questionType?: "mcq" | "text";
    options?: QuizOption[];
    correctOption?: string;
    isAnswered?: boolean;
    isSkipped?: boolean;
  };
  onInlessonAnswer?: (questionId: string, answer: string) => void;
  onInlessonSkip?: (questionId: string) => void;
}

const getIconForLine = (line: string) => {
  const lowerLine = line.toLowerCase();
  
  if (lowerLine.includes('great') || lowerLine.includes('awesome') || lowerLine.includes('love') || 
      lowerLine.includes('support') || lowerLine.includes('together') || lowerLine.includes('help you')) return Heart;
  
  if (lowerLine.includes('congrats') || lowerLine.includes('celebrate') || lowerLine.includes('achievement') ||
      lowerLine.includes('success') || lowerLine.includes('win') || lowerLine.includes('mastered')) return Award;
  
  if (lowerLine.includes('exactly') || lowerLine.includes('perfect') || lowerLine.includes('right') ||
      lowerLine.includes('correct') || lowerLine.includes('nice') || lowerLine.includes('good job')) return ThumbsUp;
  
  if (lowerLine.includes('exciting') || lowerLine.includes('amazing') || lowerLine.includes('wow') ||
      lowerLine.includes('let\'s go') || lowerLine.includes('ready')) return Star;
  
  if (lowerLine.includes('let\'s') || lowerLine.includes('try') || lowerLine.includes('do') ||
      lowerLine.includes('start') || lowerLine.includes('go ahead') || lowerLine.includes('jump in')) return Zap;
  
  if (lowerLine.includes('hey') || lowerLine.includes('hi') || lowerLine.includes('welcome') ||
      lowerLine.includes('glad') || lowerLine.includes('nice to') || lowerLine.includes('relax')) return Smile;
  
  if (lowerLine.includes('?') || lowerLine.includes('wonder') || lowerLine.includes('curious') ||
      lowerLine.includes('explore') || lowerLine.includes('find out')) return HelpCircle;
  
  if (lowerLine.includes('think') || lowerLine.includes('reflect') || lowerLine.includes('consider') ||
      lowerLine.includes('understand') || lowerLine.includes('pause') || lowerLine.includes('moment')) return Brain;
  
  if (lowerLine.includes('learn') || lowerLine.includes('know') || lowerLine.includes('discover') ||
      lowerLine.includes('understand') || lowerLine.includes('concept')) return BookOpen;
  
  if (lowerLine.includes('insight') || lowerLine.includes('realize') || lowerLine.includes('see') ||
      lowerLine.includes('notice') || lowerLine.includes('aha')) return Lightbulb;
  
  if (lowerLine.includes('careful') || lowerLine.includes('watch out') || lowerLine.includes('important') ||
      lowerLine.includes('remember') || lowerLine.includes('note')) return AlertCircle;
  
  if (lowerLine.includes('chat') || lowerLine.includes('talk') || lowerLine.includes('discuss') ||
      lowerLine.includes('share') || lowerLine.includes('tell me')) return MessageCircle;
  
  if (lowerLine.includes('fun') || lowerLine.includes('play') || lowerLine.includes('game') ||
      lowerLine.includes('challenge')) return Sparkles;
  
  if (lowerLine.includes('done') || lowerLine.includes('complete') || lowerLine.includes('finish') ||
      lowerLine.includes('accomplish')) return CheckCircle;
  
  if (lowerLine.includes('time') || lowerLine.includes('pace') || lowerLine.includes('when') ||
      lowerLine.includes('schedule')) return Clock;
  
  if (lowerLine.includes('goal') || lowerLine.includes('aim') || lowerLine.includes('target') ||
      lowerLine.includes('objective')) return Target;
  
  if (lowerLine.includes('easy') || lowerLine.includes('comfortable') || lowerLine.includes('chill') ||
      lowerLine.includes('break')) return Coffee;
  
  if (lowerLine.includes('watch') || lowerLine.includes('video') || lowerLine.includes('view')) return Play;
  
  return Sparkles; 
};

/**
 * Renders message content with markdown formatting
 * Supports:
 * - Bold text (**text**)
 * - Bullet points (•, -, 1.)
 * - Learning headers ("You'll learn:")
 * - Assessment questions (FA messages)
 */
export function MessageContent({
  content,
  messageType,
  role,
  onQuestionAnswer,
  onQuestionSkip,
  onTimestampClick,
  isFromHistory = false,
  inlessonMetadata,
  onInlessonAnswer,
  onInlessonSkip,
}: MessageContentProps) {
  // Handle in-lesson question messages
  if (messageType === "inlesson" && role === "assistant" && inlessonMetadata) {
    const { questionId, questionType, options, isAnswered, isSkipped, correctOption } = inlessonMetadata;

    if (questionType === "mcq" && options && questionId) {
      return (
        <div className="space-y-4">
          <InLessonQuestion
            question={content}
            options={options}
            isAnswered={isAnswered}
            isSkipped={isSkipped}
            correctOption={correctOption}
            onAnswer={(optionId: string) => onInlessonAnswer?.(questionId, optionId)}
            onSkip={() => onInlessonSkip?.(questionId)}
          />
        </div>
      );
    }

    return (
      <div className="text-sm leading-relaxed">
        {content}
      </div>
    );
  }

  // Handle in-lesson feedback messages
  if (messageType === "inlesson_feedback" && role === "assistant") {
    const feedback = detectAnswerFeedback(content);
    const lines = content.split('\n').filter(line => line.trim());
    const feedbackLine = lines[0] || '';
    const restLines = lines.slice(1);

    return (
      <div className="space-y-3">
        {/* Feedback Badge */}
        {(feedback.type === 'correct' || feedback.type === 'incorrect') && (
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
            
            const Icon = role === 'assistant' ? getIconForLine(listItem.content) : Sparkles;
            
            return (
              <div key={index} className={`flex items-start gap-2 my-1 ${listItem.isIndented ? "ml-6" : "ml-2"}`}>
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${role === 'assistant' ? 'text-blue-500' : 'text-gray-400'}`} />
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

