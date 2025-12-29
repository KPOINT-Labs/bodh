import {
  parseInlineMarkdown,
  parseBulletPoint,
  isLearningHeader,
} from "@/lib/chat/markdown";

interface MessageContentProps {
  content: string;
}

/**
 * Renders message content with markdown formatting
 * Supports:
 * - Bold text (**text**)
 * - Bullet points (•, -, 1.)
 * - Learning headers ("You'll learn:")
 */
export function MessageContent({ content }: MessageContentProps) {
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
