import { PanelLeftClose, Plus } from "lucide-react";
import Link from "next/link";

interface PanelHeaderProps {
  onToggleCollapse?: () => void;
}

/**
 * Header with New Course button and collapse toggle
 */
export function PanelHeader({ onToggleCollapse }: PanelHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      {/* Browse All Courses Button */}
      <Link
        className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 font-medium text-gray-800 text-sm transition-colors hover:bg-gray-50"
        href="/courses"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        Browse All Courses
      </Link>

      {/* Panel Toggle */}
      <button
        className="rounded-xl border border-gray-200 p-2.5 transition-colors hover:bg-gray-50"
        onClick={onToggleCollapse}
        title="Collapse panel"
      >
        <PanelLeftClose className="h-5 w-5 text-gray-400" />
      </button>
    </div>
  );
}
