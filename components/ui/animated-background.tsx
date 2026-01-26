"use client";

import { cn } from "@/lib/utils";

interface AnimatedBackgroundProps {
  variant?: "full" | "blobs-only" | "symbols-only" | "minimal";
  intensity?: "low" | "medium" | "high";
  theme?: "learning" | "celebration" | "auth";
  className?: string;
}

const symbols = {
  math: ["α", "∑", "π", "∫", "λ", "∆", "∞", "√", "θ", "Ω"],
  code: ["</>", "{}"],
};

const allSymbols = [...symbols.math, ...symbols.code];

export function AnimatedBackground({
  variant = "full",
  intensity = "medium",
  theme = "learning",
  className,
}: AnimatedBackgroundProps) {
  const showBlobs =
    variant === "full" || variant === "blobs-only" || variant === "minimal";
  const showSymbols =
    variant === "full" || variant === "symbols-only" || variant === "minimal";

  // Determine number of elements based on intensity and variant
  const getBlobCount = () => {
    if (variant === "minimal") {
      return 1;
    }
    if (intensity === "low") {
      return 2;
    }
    return 3;
  };

  const getSymbolCount = () => {
    if (variant === "minimal") {
      return 3;
    }
    if (intensity === "low") {
      return 6;
    }
    if (intensity === "medium") {
      return 9;
    }
    return 12;
  };

  const blobCount = getBlobCount();
  const symbolCount = getSymbolCount();

  // Symbol positions for distribution across viewport
  const symbolPositions = [
    { top: "10%", left: "15%" },
    { top: "20%", left: "80%" },
    { top: "35%", left: "25%" },
    { top: "45%", left: "70%" },
    { top: "55%", left: "10%" },
    { top: "65%", left: "85%" },
    { top: "75%", left: "30%" },
    { top: "15%", left: "60%" },
    { top: "85%", left: "50%" },
    { top: "25%", left: "40%" },
    { top: "70%", left: "65%" },
    { top: "90%", left: "20%" },
  ];

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-0 z-0 overflow-hidden",
        className
      )}
    >
      {/* Animated gradient blobs */}
      {showBlobs && (
        <>
          {blobCount >= 1 && (
            <div
              className="absolute top-[20%] left-[20%] h-96 w-96 animate-color-rotate-1 rounded-full opacity-70 mix-blend-multiply blur-3xl dark:mix-blend-lighten"
              style={{ transform: "translate(-50%, -50%)" }}
            />
          )}
          {blobCount >= 2 && (
            <div
              className="absolute right-[20%] bottom-[20%] h-96 w-96 animate-color-rotate-2 rounded-full opacity-70 mix-blend-multiply blur-3xl dark:mix-blend-lighten"
              style={{ transform: "translate(50%, 50%)" }}
            />
          )}
          {blobCount >= 3 && (
            <div
              className="absolute top-1/2 left-1/2 h-96 w-96 animate-color-rotate-3 rounded-full opacity-60 mix-blend-multiply blur-3xl dark:mix-blend-lighten"
              style={{ transform: "translate(-50%, -50%)" }}
            />
          )}
        </>
      )}

      {/* Floating symbols */}
      {showSymbols && (
        <div className="hidden lg:block">
          {Array.from({ length: symbolCount }).map((_, index) => {
            const symbol = allSymbols[index % allSymbols.length];
            const position = symbolPositions[index];
            const floatClass = `animate-float-${(index % 12) + 1}`;

            return (
              <div
                className={cn(
                  "absolute select-none text-8xl blur-sm",
                  "text-purple-400/40 dark:text-purple-400/20",
                  floatClass
                )}
                key={index}
                style={{
                  top: position.top,
                  left: position.left,
                }}
              >
                {symbol}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
