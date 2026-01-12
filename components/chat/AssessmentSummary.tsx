'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, ClipboardCheck } from 'lucide-react';
import { MessageContent } from './MessageContent';

interface AssessmentSummaryProps {
  content: string;
  onTimestampClick?: (seconds: number, youtubeVideoId?: string | null) => void;
}

/**
 * Assessment Summary component that shows a teaser message with a reveal button
 * When clicked, expands to show the full assessment feedback
 */
export function AssessmentSummary({ content, onTimestampClick }: AssessmentSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-3">
      {/* Teaser message */}
      <div className="text-sm leading-relaxed text-gray-700">
        <p>That&apos;s it for the quick check.</p>
        <p className="mt-1">Let&apos;s look at how this went overall.</p>
      </div>

      {/* View feedback button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors text-sm font-medium"
      >
        <ClipboardCheck className="h-4 w-4" />
        {isExpanded ? 'Hide feedback' : 'View feedback'}
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {/* Expanded feedback content */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <MessageContent content={content} onTimestampClick={onTimestampClick} />
        </div>
      )}
    </div>
  );
}
