import { FileText } from "lucide-react";
import { AudioToggleButton } from "@/components/audio/AudioToggleButton";

interface LessonHeaderProps {
  courseTitle: string;
  moduleTitle: string;
  additionalActions?: React.ReactNode;
}

export function LessonHeader({
  courseTitle,
  moduleTitle,
  additionalActions,
}: LessonHeaderProps) {
  return (
    <div className="border-b bg-background px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-blue-600 text-lg">
              {courseTitle}
            </h1>
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground text-sm">{moduleTitle}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AudioToggleButton />
          {additionalActions}
        </div>
      </div>
    </div>
  );
}
