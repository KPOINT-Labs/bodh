import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface InteractiveCardProps {
  title: string;
  description: string;
  children?: ReactNode;
  actions?: Array<{
    label: string;
    variant?:
      | "default"
      | "outline"
      | "secondary"
      | "ghost"
      | "link"
      | "destructive";
    onClick?: () => void;
  }>;
  className?: string;
}

export function InteractiveCard({
  title,
  description,
  children,
  actions = [],
  className = "",
}: InteractiveCardProps) {
  return (
    <Card className={`p-6 ${className}`}>
      <h3 className="mb-4 font-semibold text-sm">{title}</h3>
      <p className="mb-4 text-muted-foreground text-sm">{description}</p>

      {children && <div className="mb-4">{children}</div>}

      {actions.length > 0 && (
        <div className="flex gap-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              onClick={action.onClick}
              size="sm"
              variant={action.variant || "outline"}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </Card>
  );
}
