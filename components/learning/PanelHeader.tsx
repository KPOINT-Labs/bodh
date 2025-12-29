import { Button } from "@/components/ui/button";
import { Plus, Menu } from "lucide-react";

interface PanelHeaderProps {
  onToggleCollapse?: () => void;
}

/**
 * Header with New Course button and collapse toggle
 */
export function PanelHeader({ onToggleCollapse }: PanelHeaderProps) {
  return (
    <div className="p-4 flex items-center gap-3">
      <Button
        variant="outline"
        className="flex-1 gap-2 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 rounded-lg px-4 py-2 h-10 text-sm font-medium justify-center"
      >
        <Plus className="h-4 w-4" />
        New Course
      </Button>
      <button
        onClick={onToggleCollapse}
        className="p-2.5 border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
        title="Collapse panel"
      >
        <Menu className="h-5 w-5 text-gray-400" />
      </button>
    </div>
  );
}
