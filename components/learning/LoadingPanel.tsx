import { Loader2 } from "lucide-react";

interface LoadingPanelProps {
  className?: string;
}

/**
 * Loading state with spinner
 */
export function LoadingPanel({ className = "" }: LoadingPanelProps) {
  return (
    <div className={`flex h-full flex-col bg-white items-center justify-center ${className}`}>
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      <p className="mt-2 text-sm text-gray-500">Loading courses...</p>
    </div>
  );
}
