"use client";

import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuizFeedbackProps {
  isCorrect: boolean;
  feedback: string;
  onContinue: () => void;
  showContinue?: boolean;
  continueLabel?: string;
}

export function QuizFeedback({
  isCorrect,
  feedback,
  onContinue,
  showContinue = true,
  continueLabel = "Continue",
}: QuizFeedbackProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Result indicator */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg p-4",
          isCorrect
            ? "border border-green-200 bg-green-50"
            : "border border-red-200 bg-red-50"
        )}
      >
        {isCorrect ? (
          <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-green-600" />
        ) : (
          <XCircle className="h-6 w-6 flex-shrink-0 text-red-600" />
        )}
        <div className="flex flex-col gap-1">
          <span
            className={cn(
              "font-semibold text-sm",
              isCorrect ? "text-green-800" : "text-red-800"
            )}
          >
            {isCorrect ? "Correct!" : "Not quite right"}
          </span>
        </div>
      </div>

      {/* Feedback text */}
      {feedback && (
        <div className="rounded-lg bg-muted/50 p-3 text-muted-foreground text-sm leading-relaxed">
          {feedback}
        </div>
      )}

      {/* Continue button */}
      {showContinue && (
        <div className="flex justify-end pt-2">
          <Button className="gap-2" onClick={onContinue} size="sm">
            {continueLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
