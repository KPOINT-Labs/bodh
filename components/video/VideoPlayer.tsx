import { Card } from "@/components/ui/card";

interface VideoPlayerProps {
  videoId: string;
  courseId?: string;
  title?: string;
  onProgress?: (time: number) => void;
  className?: string;
}

export function VideoPlayer({
  videoId,
  courseId,
  title = "KPoint Video Player",
  className = ""
}: VideoPlayerProps) {
  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="relative aspect-video bg-muted">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="mb-2 text-4xl">🎬</div>
            <p className="text-sm text-muted-foreground">
              {title} will load here
            </p>
            <p className="text-xs text-muted-foreground">
              Video ID: {videoId}
            </p>
            {courseId && (
              <p className="text-xs text-muted-foreground">
                Course ID: {courseId}
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}