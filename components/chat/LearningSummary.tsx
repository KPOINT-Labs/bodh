'use client';

import { CheckCircle2, FileText, Play, ExternalLink } from 'lucide-react';

interface LearningSummaryProps {
  lessonId: string;
}

interface SuggestedAid {
  type: 'summary' | 'reel';
  title: string;
  duration: string;
  url?: string;
}

// Hardcoded data for Lesson 2 (Iteration)
const LESSON_SUMMARIES: Record<string, {
  understoodWell: string[];
  topicsToRevisit?: string[];
  suggestedAids: SuggestedAid[];
}> = {
  'cmjh2nn7m0006k4d2jj3hj5rb': {
    understoodWell: [
      'Iteration as a systematic process',
      'Initialization of variables',
      'Knowing when an iteration should stop',
      'Tracking multiple variables in parallel',
    ],
    topicsToRevisit: [
      'Accumulation using sum variable',
      'Filtering vs Ignoring during iteration',
    ],
    suggestedAids: [
      {
        type: 'summary',
        title: 'Iteration + Accumulation',
        duration: '2-minute',
        url: 'https://bodh.kpoint.com/web/videos/gcc-3b1fac68-d1c2-4497-b483-06b6c4107938'
      },
      { type: 'reel', title: 'Filtering vs Ignoring', duration: '1-minute' },
    ],
  },
};

// Default fallback for lessons without hardcoded data
const DEFAULT_SUMMARY = {
  understoodWell: [
    'Core concepts from this lesson',
    'Key terminology and definitions',
  ],
  suggestedAids: [
    {
      type: 'summary' as const,
      title: 'Lesson recap',
      duration: '2-minute',
      url: 'https://bodh.kpoint.com/web/videos/gcc-3b1fac68-d1c2-4497-b483-06b6c4107938'
    },
  ],
};

/**
 * Learning Summary component that displays post-assessment feedback
 * Shows what the learner understood well and suggests review materials
 */
export function LearningSummary({ lessonId }: LearningSummaryProps) {
  const data = LESSON_SUMMARIES[lessonId] || DEFAULT_SUMMARY;

  return (
    <div className="space-y-4">
      {/* Title */}
      <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
        <span>📊</span> Your Learning Summary
      </h3>

      {/* What You Understood Well */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
          <span className="text-green-600">✅</span> What You Understood Well
        </h4>
        <p className="text-sm text-gray-600 mb-2">
          You&apos;re clearly comfortable with these ideas:
        </p>
        <ul className="space-y-1.5">
          {data.understoodWell.map((item, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Topics to Revisit (if any) */}
      {data.topicsToRevisit && data.topicsToRevisit.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <p className="text-sm text-gray-600">
            I recommend revisiting just these parts — not the whole lesson:
          </p>
          <ul className="space-y-1.5">
            {data.topicsToRevisit.map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-amber-500">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggested Aids */}
      <div className="space-y-2 pt-2 border-t border-gray-100">
        <h4 className="text-sm font-medium text-gray-700">Suggested Aids</h4>
        <div className="space-y-2">
          {data.suggestedAids.map((aid, index) =>
            aid.url ? (
              <a
                key={index}
                href={aid.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-2.5 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm cursor-pointer transition-colors group"
              >
                {aid.type === 'summary' ? (
                  <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                ) : (
                  <Play className="h-4 w-4 text-blue-600 shrink-0" />
                )}
                <span className="text-gray-700 flex-1">
                  <span className="text-gray-500">{aid.duration}:</span>{' '}
                  {aid.title}
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ) : (
              <div
                key={index}
                className="flex items-center gap-3 p-2.5 bg-blue-50 rounded-lg text-sm"
              >
                {aid.type === 'summary' ? (
                  <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                ) : (
                  <Play className="h-4 w-4 text-blue-600 shrink-0" />
                )}
                <span className="text-gray-700">
                  <span className="text-gray-500">{aid.duration}:</span>{' '}
                  {aid.title}
                </span>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
