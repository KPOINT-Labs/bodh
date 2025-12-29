import { PanelHeader } from "./PanelHeader";

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
        <LaptopIcon className="h-12 w-12 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500 text-center">No courses enrolled yet</p>
        <p className="text-xs text-gray-400 text-center mt-1">
          Enroll in a course to start learning
        </p>
      </div>
    </div>
  );
}
