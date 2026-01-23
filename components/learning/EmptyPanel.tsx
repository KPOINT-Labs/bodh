import { Monitor } from "lucide-react";
import { PanelHeader } from "./PanelHeader";

interface EmptyPanelProps {
  className?: string;
  onToggleCollapse?: () => void;
}

/**
 * Empty state when no courses are enrolled
 */
export function EmptyPanel({
  className = "",
  onToggleCollapse,
}: EmptyPanelProps) {
  return (
    <div className={`flex h-full flex-col bg-white ${className}`}>
      <PanelHeader onToggleCollapse={onToggleCollapse} />

      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <Monitor className="mb-3 h-12 w-12 text-gray-300" />
        <p className="text-center text-gray-500 text-sm">
          No courses enrolled yet
        </p>
        <p className="mt-1 text-center text-gray-400 text-xs">
          Enroll in a course to start learning
        </p>
      </div>
    </div>
  );
}
