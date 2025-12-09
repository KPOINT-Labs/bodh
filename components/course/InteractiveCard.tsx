import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface InteractiveCardProps {
  title: string;
  description: string;
  children?: ReactNode;
  actions?: Array<{
    label: string;
    variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
    onClick?: () => void;
  }>;
  className?: string;
}

export function InteractiveCard({
  title,
  description,
  children,
  actions = [],
  className = ""
}: InteractiveCardProps) {
  return (
    <Card className={`p-6 ${className}`}>
      <h3 className="mb-4 text-sm font-semibold">
        {title}
      </h3>
      <p className="mb-4 text-sm text-muted-foreground">
        {description}
      </p>

      {children && (
        <div className="mb-4">
          {children}
        </div>
      )}

      {actions.length > 0 && (
        <div className="flex gap-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              size="sm"
              variant={action.variant || "outline"}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </Card>
  );
}