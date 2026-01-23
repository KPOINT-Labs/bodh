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
    <div className="mb-6 flex items-center gap-3 border-gray-100 border-b pb-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500">
        <Sparkles className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="font-semibold text-gray-900 text-sm">{title}</p>
        <p className="text-gray-500 text-xs">{subtitle}</p>
      </div>
    </div>
  );
}
