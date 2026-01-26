import { Play } from "lucide-react";
import React from "react";

/**
 * Parse inline markdown (bold text and links) and return React nodes
 * Supports **bold** and [text](url) syntax
 * YouTube links are rendered as clickable buttons when onYouTubeClick is provided
 */
export function parseInlineMarkdown(
  text: string,
  onYouTubeClick?: (seconds: number, youtubeVideoId: string | null) => void
): React.ReactNode {
  // First split by links, then by bold
  // Regex for markdown links: [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before this link (with bold parsing)
    if (match.index > lastIndex) {
      const beforeText = text.slice(lastIndex, match.index);
      result.push(...parseBoldText(beforeText, keyIndex));
      keyIndex += beforeText.split(/(\*\*[^*]+\*\*)/g).length;
    }

    // Add the link
    const linkText = match[1];
    const linkUrl = match[2];

    // Check if this is a YouTube URL
    const youtubeVideoId = extractYouTubeVideoId(linkUrl);

    if (youtubeVideoId && onYouTubeClick) {
      // Extract time parameter if present (t=XXXs or t=XXX)
      const timeMatch = linkUrl.match(/[?&]t=(\d+)s?/);
      const seconds = timeMatch ? Number.parseInt(timeMatch[1], 10) : 0;

      // Render as clickable button for YouTube links with play icon
      result.push(
        React.createElement(
          "button",
          {
            key: `yt-link-${keyIndex++}`,
            className:
              "text-blue-600 hover:text-blue-800 hover:underline cursor-pointer inline-flex items-center gap-1",
            onClick: () => onYouTubeClick(seconds, youtubeVideoId),
            type: "button",
          },
          React.createElement(Play, {
            className: "h-3 w-3 fill-current",
            key: "icon",
          }),
          linkText
        )
      );
    } else {
      // Regular link - open in new tab
      result.push(
        React.createElement(
          "a",
          {
            key: `link-${keyIndex++}`,
            href: linkUrl,
            target: "_blank",
            rel: "noopener noreferrer",
            className: "text-blue-600 hover:text-blue-800 hover:underline",
          },
          linkText
        )
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text (with bold parsing)
  if (lastIndex < text.length) {
    result.push(...parseBoldText(text.slice(lastIndex), keyIndex));
  }

  return result.length > 0 ? result : text;
}

/**
 * Parse bold text (**text**) and return array of React nodes
 */
function parseBoldText(text: string, startKey: number): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return React.createElement(
        "strong",
        { key: `bold-${startKey + i}`, className: "font-semibold" },
        part.slice(2, -2)
      );
    }
    return part;
  });
}

/**
 * Parse inline markdown with timestamp links and YouTube links
 * Supports **bold**, [text (MM:SS)](url?t=XXXs) timestamp links, and [text](youtubeUrl) links
 * YouTube links render as clickable buttons that play video in panel
 */
export function parseInlineMarkdownWithTimestamps(
  text: string,
  onTimestampClick?: (seconds: number, youtubeVideoId?: string | null) => void
): React.ReactNode {
  // First, parse timestamp links
  const { parts } = parseTimestampLinks(text);

  if (parts.length === 0) {
    return parseInlineMarkdown(text, onTimestampClick);
  }

  return parts.map((part, i) => {
    if (part.type === "timestamp" && part.link) {
      const { text: linkText, seconds, youtubeVideoId } = part.link;
      return React.createElement(
        "button",
        {
          key: `ts-${i}`,
          className:
            "text-blue-600 hover:text-blue-800 hover:underline cursor-pointer inline-flex items-center gap-1",
          onClick: () => onTimestampClick?.(seconds, youtubeVideoId),
          type: "button",
        },
        [
          React.createElement(Play, {
            className: "h-3 w-3 fill-current",
            key: "icon",
          }),
          linkText,
        ]
      );
    }
    // Parse bold text and YouTube links in remaining text parts
    return React.createElement(
      React.Fragment,
      { key: `txt-${i}` },
      parseInlineMarkdown(part.content, onTimestampClick)
    );
  });
}

/**
 * Check if a line is a bullet point (•, -, or numbered like 1.)
 * Returns the match result or null
 * Note: Single dash must be followed by space to avoid matching horizontal rules
 */
export function parseBulletPoint(line: string): RegExpMatchArray | null {
  const trimmed = line.trim();
  // Single dash must have content after the space (not just "- " or "---")
  if (trimmed.startsWith("-")) {
    // Match bullet only if it's a single dash followed by space and content
    const match = trimmed.match(/^(-)\s+(.+)/);
    if (match) {
      return match;
    }
    return null;
  }
  // Handle bullet (•) and numbered lists (1., 2., etc.)
  return trimmed.match(/^(•|\d+\.)\s*/);
}

/**
 * Parse a list item and determine its type (numbered or bullet)
 * Detects indentation based on leading whitespace
 */
export interface ListItemResult {
  type: "numbered" | "bullet" | "none";
  number?: number;
  content: string;
  isIndented: boolean;
}

export function parseListItem(line: string): ListItemResult | null {
  // Check for leading whitespace (indentation)
  const leadingWhitespace = line.match(/^(\s*)/);
  const isIndented = leadingWhitespace
    ? leadingWhitespace[1].length > 0
    : false;
  const trimmed = line.trim();

  // Check for numbered list item (1., 2., etc.)
  const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
  if (numberedMatch) {
    return {
      type: "numbered",
      number: Number.parseInt(numberedMatch[1], 10),
      content: numberedMatch[2],
      isIndented,
    };
  }

  // Check for dash bullet point
  const dashMatch = trimmed.match(/^-\s+(.+)/);
  if (dashMatch) {
    return {
      type: "bullet",
      content: dashMatch[1],
      isIndented,
    };
  }

  // Check for bullet point (•)
  const bulletMatch = trimmed.match(/^•\s*(.+)/);
  if (bulletMatch) {
    return {
      type: "bullet",
      content: bulletMatch[1],
      isIndented,
    };
  }

  return null;
}

/**
 * Check if a line is a "You'll learn:" header
 */
export function isLearningHeader(line: string): boolean {
  return line.trim().toLowerCase().includes("you'll learn");
}

/**
 * Check if a line is a markdown header (# ## ### etc.)
 * Returns the header level (1-6) and text, or null
 */
export function parseHeader(
  line: string
): { level: number; text: string } | null {
  const match = line.trim().match(/^(#{1,6})\s+(.+)/);
  if (match) {
    return {
      level: match[1].length,
      text: match[2],
    };
  }
  return null;
}

/**
 * Check if a line is a horizontal rule (---, ***, ___)
 */
export function isHorizontalRule(line: string): boolean {
  const trimmed = line.trim();
  return /^(-{3,}|\*{3,}|_{3,})$/.test(trimmed);
}

/**
 * Timestamp link data parsed from markdown
 */
export interface TimestampLink {
  text: string;
  displayTime: string;
  seconds: number;
  youtubeVideoId: string | null;
}

/**
 * Extract YouTube video ID from a URL
 * Supports formats like: youtube.com/watch?v=VIDEO_ID, youtu.be/VIDEO_ID
 */
function extractYouTubeVideoId(url: string): string | null {
  // Match v= parameter in URL
  const vParamMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (vParamMatch) {
    return vParamMatch[1];
  }
  // Match youtu.be/VIDEO_ID format
  const shortUrlMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortUrlMatch) {
    return shortUrlMatch[1];
  }
  return null;
}

/**
 * Parse timestamp links from text
 * Format: [Watch explanation (38:32)](https://www.youtube.com/watch?v=...&t=2312s)
 * Returns array of matches with their positions
 */
export function parseTimestampLinks(text: string): {
  links: TimestampLink[];
  parts: {
    type: "text" | "timestamp";
    content: string;
    link?: TimestampLink;
  }[];
} {
  // Match [text (MM:SS)](url?t=XXXs) or [text (H:MM:SS)](url?t=XXXs)
  const regex =
    /\[([^\]]*\((\d{1,2}:\d{2}(?::\d{2})?)\))\]\(([^)]+[?&]t=(\d+)s?[^)]*)\)/g;

  const links: TimestampLink[] = [];
  const parts: {
    type: "text" | "timestamp";
    content: string;
    link?: TimestampLink;
  }[] = [];

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }

    const fullText = match[1]; // "Watch explanation (38:32)"
    const displayTime = match[2]; // "38:32"
    const url = match[3]; // Full URL
    const seconds = Number.parseInt(match[4], 10); // 2312
    const youtubeVideoId = extractYouTubeVideoId(url);

    const link: TimestampLink = {
      text: fullText,
      displayTime,
      seconds,
      youtubeVideoId,
    };
    links.push(link);
    parts.push({ type: "timestamp", content: fullText, link });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) });
  }

  return { links, parts };
}

/**
 * Check if text contains timestamp links
 */
export function hasTimestampLinks(text: string): boolean {
  const regex =
    /\[[^\]]*\(\d{1,2}:\d{2}(?::\d{2})?\)\]\([^)]+[?&]t=\d+s?[^)]*\)/;
  return regex.test(text);
}
