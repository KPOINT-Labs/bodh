import { Plus } from "lucide-react";

// Laptop/Monitor icon
function LaptopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M2 20h20" />
      <path d="M7 16v4" />
      <path d="M17 16v4" />
    </svg>
  );
}

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
        className="p-3 hover:bg-gray-100 rounded-lg transition-colors"
        title="My Courses"
      >
        <LaptopIcon className="h-5 w-5 text-gray-600" />
      </button>
    </div>
  );
}
