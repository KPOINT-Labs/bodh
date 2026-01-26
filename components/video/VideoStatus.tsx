interface VideoStatusProps {
  isPlaying?: boolean;
  status?: string;
}

export function VideoStatus({
  isPlaying = true,
  status = "Video is playing",
}: VideoStatusProps) {
  return (
    <div className="flex items-center gap-2 border-t px-4 py-2">
      <div
        className={`h-2 w-2 rounded-full ${
          isPlaying ? "animate-pulse bg-green-500" : "bg-gray-400"
        }`}
      />
      <span className="text-muted-foreground text-xs">{status}</span>
    </div>
  );
}
