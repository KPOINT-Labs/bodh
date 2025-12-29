import { Button } from "@/components/ui/button";

interface ErrorPanelProps {
  className?: string;
  error: string;
}

/**
 * Error state with retry button
 */
export function ErrorPanel({ className = "", error }: ErrorPanelProps) {
  return (
    <div className={`flex h-full flex-col bg-white items-center justify-center p-4 ${className}`}>
      <p className="text-sm text-red-500 text-center">{error}</p>
      <Button
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() => window.location.reload()}
      >
        Retry
      </Button>
    </div>
  );
}
