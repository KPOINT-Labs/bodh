import { Sparkles } from "lucide-react";

interface ChatHeaderProps {
  title?: string;
  subtitle?: string;
}

/**
 * Header component for chat agent
 * Shows agent avatar with title and subtitle
 */
export function ChatHeader({
  title = "AI Learning Assistant",
  subtitle = "Your personal guide",
}: ChatHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500">
        <Sparkles className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}
