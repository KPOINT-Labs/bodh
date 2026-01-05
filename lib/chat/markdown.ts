import React from "react";

/**
 * Parse inline markdown (bold text) and return React nodes
 * Supports **bold** syntax
 */
export function parseInlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return React.createElement(
        "strong",
        { key: i, className: "font-semibold" },
        part.slice(2, -2)
      );
    }
    return part;
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
 * Check if a line is a "You'll learn:" header
 */
export function isLearningHeader(line: string): boolean {
  return line.trim().toLowerCase().includes("you'll learn");
}

/**
 * Check if a line is a markdown header (# ## ### etc.)
 * Returns the header level (1-6) and text, or null
 */
export function parseHeader(line: string): { level: number; text: string } | null {
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
