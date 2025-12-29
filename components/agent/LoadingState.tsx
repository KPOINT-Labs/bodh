import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface LoadingStateProps {
  isReturningUser?: boolean;
}

/**
 * Loading state for chat agent initialization
 * Shows different messages for new vs returning users
 */
export function LoadingState({ isReturningUser = false }: LoadingStateProps) {
  return (
    <Card className="bg-white border border-gray-200 shadow-sm p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-gray-900">
            AI Learning Assistant
          </p>
          <p className="text-sm text-gray-500">
            {isReturningUser
              ? "Welcome back! Loading your conversation..."
              : "Preparing your personalized welcome message..."}
          </p>
        </div>
      </div>
    </Card>
  );
}
