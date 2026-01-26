import { Sparkles } from "lucide-react";

/**
 * Animated typing indicator showing bouncing dots
 * Displayed while waiting for assistant response
 */
export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500">
        <Sparkles className="h-4 w-4 text-white" />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-gray-50 px-4 py-3">
        <span
          className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}
