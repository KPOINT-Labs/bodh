import { Monitor, Plus } from "lucide-react";

interface CollapsedPanelProps {
  className?: string;
  onToggleCollapse?: () => void;
}

/**
 * Collapsed sidebar view with icon buttons
 */
export function CollapsedPanel({
  className = "",
  onToggleCollapse,
}: CollapsedPanelProps) {
  return (
    <div
      className={`flex h-full flex-col items-center bg-white py-4 ${className}`}
    >
      <button
        className="mb-2 rounded-lg p-3 transition-colors hover:bg-gray-100"
        onClick={onToggleCollapse}
        title="New Course"
      >
        <Plus className="h-5 w-5 text-gray-600" />
      </button>
      <button
        className="tour-sidebar-toggle rounded-lg p-3 transition-colors hover:bg-gray-100"
        onClick={onToggleCollapse}
        title="My Courses"
      >
        <Monitor className="h-5 w-5 text-gray-600" />
      </button>
    </div>
  );
}
