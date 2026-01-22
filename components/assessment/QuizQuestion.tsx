"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { QuizOption } from "@/types/assessment";

interface QuizQuestionProps {
  question: string;
  type: "mcq" | "text";
  options?: QuizOption[];
  onSubmit: (answer: string) => void;
  onSkip: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function QuizQuestion({
  question,
  type,
  options,
  onSubmit,
  onSkip,
  isLoading = false,
  disabled = false,
}: QuizQuestionProps) {
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [textAnswer, setTextAnswer] = useState<string>("");

  const handleSubmit = () => {
    if (type === "mcq") {
      if (selectedOption) {
        onSubmit(selectedOption);
      }
    } else {
      if (textAnswer.trim()) {
        onSubmit(textAnswer.trim());
      }
    }
  };

  const canSubmit =
    type === "mcq"
      ? !!selectedOption
      : textAnswer.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Question text */}
      <div className="text-base font-medium text-foreground leading-relaxed">
        {question}
      </div>

      {/* Answer input based on type */}
      {type === "mcq" && options ? (
        <RadioGroup
          value={selectedOption}
          onValueChange={setSelectedOption}
          className="flex flex-col gap-3"
          disabled={disabled || isLoading}
        >
          {options.map((option, index) => (
            <div
              key={option.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                selectedOption === option.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              )}
              onClick={() => !disabled && !isLoading && setSelectedOption(option.id)}
            >
              <RadioGroupItem value={option.id} id={`option-${option.id}`} />
              <Label
                htmlFor={`option-${option.id}`}
                className="flex-1 cursor-pointer text-sm"
              >
                <span className="font-medium text-muted-foreground mr-2">
                  {String.fromCharCode(65 + index)}.
                </span>
                {option.text}
              </Label>
            </div>
          ))}
        </RadioGroup>
      ) : (
        <Textarea
          value={textAnswer}
          onChange={(e) => setTextAnswer(e.target.value)}
          placeholder="Type your answer here..."
          className="min-h-[100px] resize-none"
          disabled={disabled || isLoading}
        />
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          disabled={disabled || isLoading}
          className="text-muted-foreground"
        >
          Skip
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || disabled || isLoading}
          size="sm"
        >
          {isLoading ? "Checking..." : "Submit"}
        </Button>
      </div>
    </div>
  );
}
