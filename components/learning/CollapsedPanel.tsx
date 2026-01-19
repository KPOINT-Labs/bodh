import { Plus, Monitor } from "lucide-react";

interface CollapsedPanelProps {
  className?: string;
  onToggleCollapse?: () => void;
}

/**
 * Collapsed sidebar view with icon buttons
 */
export function CollapsedPanel({ className = "", onToggleCollapse }: CollapsedPanelProps) {
  return (
    <div className={`flex h-full flex-col bg-white items-center py-4 ${className}`}>
      <button
        onClick={onToggleCollapse}
        className="p-3 hover:bg-gray-100 rounded-lg transition-colors mb-2"
        title="New Course"
      >
        <Plus className="h-5 w-5 text-gray-600" />
      </button>
      <button
        onClick={onToggleCollapse}
        className="tour-sidebar-toggle p-3 hover:bg-gray-100 rounded-lg transition-colors"
        title="My Courses"
      >
        <Monitor className="h-5 w-5 text-gray-600" />
      </button>
    </div>
  );
}
