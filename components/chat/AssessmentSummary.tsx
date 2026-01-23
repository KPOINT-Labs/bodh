"use client";

import { ChevronDown, ChevronUp, ClipboardCheck } from "lucide-react";
import { useState } from "react";
import { MessageContent } from "./MessageContent";

interface AssessmentSummaryProps {
  content: string;
  onTimestampClick?: (seconds: number, youtubeVideoId?: string | null) => void;
}

/**
 * Assessment Summary component that shows a teaser message with a reveal button
 * When clicked, expands to show the full assessment feedback
 */
export function AssessmentSummary({
  content,
  onTimestampClick,
}: AssessmentSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-3">
      {/* Teaser message */}
      <div className="text-gray-700 text-sm leading-relaxed">
        <p>That&apos;s it for the quick check.</p>
        <p className="mt-1">Let&apos;s look at how this went overall.</p>
      </div>

      {/* View feedback button */}
      <button
        className="flex w-full items-center justify-center rounded-lg border border-blue-200 bg-transparent px-4 py-2 font-medium text-blue-600 text-sm transition-colors hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <ClipboardCheck className="h-4 w-4" />
        {isExpanded ? "Hide feedback" : "View feedback"}
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {/* Expanded feedback content */}
      {isExpanded && (
        <div className="mt-3 border-gray-100 border-t pt-3">
          <MessageContent
            content={content}
            onTimestampClick={onTimestampClick}
          />
        </div>
      )}
    </div>
  );
}
