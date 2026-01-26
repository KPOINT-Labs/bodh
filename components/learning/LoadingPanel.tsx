import { Loader2 } from "lucide-react";

interface LoadingPanelProps {
  className?: string;
}

/**
 * Loading state with spinner
 */
export function LoadingPanel({ className = "" }: LoadingPanelProps) {
  return (
    <div
      className={`flex h-full flex-col items-center justify-center bg-white ${className}`}
    >
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      <p className="mt-2 text-gray-500 text-sm">Loading courses...</p>
    </div>
  );
}
