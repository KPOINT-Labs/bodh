import { Monitor } from "lucide-react";
import { PanelHeader } from "./PanelHeader";

interface EmptyPanelProps {
  className?: string;
  onToggleCollapse?: () => void;
}

/**
 * Empty state when no courses are enrolled
 */
export function EmptyPanel({ className = "", onToggleCollapse }: EmptyPanelProps) {
  return (
    <div className={`flex h-full flex-col bg-white ${className}`}>
      <PanelHeader onToggleCollapse={onToggleCollapse} />

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <Monitor className="h-12 w-12 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500 text-center">No courses enrolled yet</p>
        <p className="text-xs text-gray-400 text-center mt-1">
          Enroll in a course to start learning
        </p>
      </div>
    </div>
  );
}
