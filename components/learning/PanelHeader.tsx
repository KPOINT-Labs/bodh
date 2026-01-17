import { Plus, PanelLeftClose } from "lucide-react";
import Link from "next/link";

interface PanelHeaderProps {
  onToggleCollapse?: () => void;
}

/**
 * Header with New Course button and collapse toggle
 */
export function PanelHeader({ onToggleCollapse }: PanelHeaderProps) {
  return (
    <div className="p-4 flex items-center justify-between gap-4">
      {/* New Course Button */}
      <Link
        href="/courses"
        className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        New Course
      </Link>

      {/* Panel Toggle */}
      <button
        onClick={onToggleCollapse}
        className="p-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
        title="Collapse panel"
      >
        <PanelLeftClose className="h-5 w-5 text-gray-400" />
      </button>
    </div>
  );
}
