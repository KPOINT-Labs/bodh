"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
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
    } else if (textAnswer.trim()) {
      onSubmit(textAnswer.trim());
    }
  };

  const canSubmit =
    type === "mcq" ? !!selectedOption : textAnswer.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Question text */}
      <div className="font-medium text-base text-foreground leading-relaxed">
        {question}
      </div>

      {/* Answer input based on type */}
      {type === "mcq" && options ? (
        <RadioGroup
          className="flex flex-col gap-3"
          disabled={disabled || isLoading}
          onValueChange={setSelectedOption}
          value={selectedOption}
        >
          {options.map((option, index) => (
            <div
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                selectedOption === option.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              )}
              key={option.id}
              onClick={() =>
                !(disabled || isLoading) && setSelectedOption(option.id)
              }
            >
              <RadioGroupItem id={`option-${option.id}`} value={option.id} />
              <Label
                className="flex-1 cursor-pointer text-sm"
                htmlFor={`option-${option.id}`}
              >
                <span className="mr-2 font-medium text-muted-foreground">
                  {String.fromCharCode(65 + index)}.
                </span>
                {option.text}
              </Label>
            </div>
          ))}
        </RadioGroup>
      ) : (
        <Textarea
          className="min-h-[100px] resize-none"
          disabled={disabled || isLoading}
          onChange={(e) => setTextAnswer(e.target.value)}
          placeholder="Type your answer here..."
          value={textAnswer}
        />
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          className="text-muted-foreground"
          disabled={disabled || isLoading}
          onClick={onSkip}
          size="sm"
          variant="ghost"
        >
          Skip
        </Button>
        <Button
          disabled={!canSubmit || disabled || isLoading}
          onClick={handleSubmit}
          size="sm"
        >
          {isLoading ? "Checking..." : "Submit"}
        </Button>
      </div>
    </div>
  );
}
