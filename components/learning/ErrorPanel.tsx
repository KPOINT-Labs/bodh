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
    <div
      className={`flex h-full flex-col items-center justify-center bg-white p-4 ${className}`}
    >
      <p className="text-center text-red-500 text-sm">{error}</p>
      <Button
        className="mt-2"
        onClick={() => window.location.reload()}
        size="sm"
        variant="outline"
      >
        Retry
      </Button>
    </div>
  );
}
