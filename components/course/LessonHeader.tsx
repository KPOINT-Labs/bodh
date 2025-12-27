import { FileText } from "lucide-react";

interface LessonHeaderProps {
  courseTitle: string;
  moduleTitle: string;
}

export function LessonHeader({ courseTitle, moduleTitle }: LessonHeaderProps) {
  return (
    <div className="border-b bg-background px-6 py-4">
      <div className="flex items-center gap-4">
        <FileText className="h-5 w-5 text-muted-foreground" />
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-blue-600">{courseTitle}</h1>
          <span className="text-muted-foreground">|</span>
          <span className="text-sm text-muted-foreground">
            {moduleTitle}
          </span>
        </div>
      </div>
    </div>
  );
}