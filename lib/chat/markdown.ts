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
 */
export function parseBulletPoint(line: string): RegExpMatchArray | null {
  return line.trim().match(/^(•|-|\d+\.)\s*/);
}

/**
 * Check if a line is a "You'll learn:" header
 */
export function isLearningHeader(line: string): boolean {
  return line.trim().toLowerCase().includes("you'll learn");
}
