interface VideoStatusProps {
  isPlaying?: boolean;
  status?: string;
}

export function VideoStatus({
  isPlaying = true,
  status = "Video is playing"
}: VideoStatusProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-t">
      <div
        className={`h-2 w-2 rounded-full ${
          isPlaying
            ? "animate-pulse bg-green-500"
            : "bg-gray-400"
        }`}
      />
      <span className="text-xs text-muted-foreground">
        {status}
      </span>
    </div>
  );
}