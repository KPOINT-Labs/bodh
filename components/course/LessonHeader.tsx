import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

interface LessonHeaderProps {
  courseTitle: string;
  lessonObjective: string;
}

export function LessonHeader({ courseTitle, lessonObjective }: LessonHeaderProps) {
  return (
    <div className="border-b bg-background px-6 py-4">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">{courseTitle}</h1>
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm text-muted-foreground">
            {lessonObjective}
          </span>
        </div>
      </div>
    </div>
  );
}