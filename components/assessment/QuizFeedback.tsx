"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
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
          "flex items-center gap-3 p-4 rounded-lg",
          isCorrect
            ? "bg-green-50 border border-green-200"
            : "bg-red-50 border border-red-200"
        )}
      >
        {isCorrect ? (
          <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
        ) : (
          <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
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
        <div className="text-sm text-muted-foreground leading-relaxed p-3 bg-muted/50 rounded-lg">
          {feedback}
        </div>
      )}

      {/* Continue button */}
      {showContinue && (
        <div className="flex justify-end pt-2">
          <Button onClick={onContinue} size="sm" className="gap-2">
            {continueLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
