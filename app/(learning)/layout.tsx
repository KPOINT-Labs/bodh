"use client";

import { ReactNode, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PeerLearningPanel } from "@/components/learning/PeerLearningPanel";
import { LearningPanelProvider, useLearningPanel } from "@/contexts/LearningPanelContext";
import { CourseProgressProvider } from "@/contexts/CourseProgressContext";

function LearningLayoutContent({ children }: { children: ReactNode }) {
  const { isCollapsed, toggleCollapse } = useLearningPanel();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Extract moduleId from URL pattern: /course/[courseId]/module/[moduleId]
  const activeModuleId = useMemo(() => {
    const match = pathname?.match(/\/course\/[^/]+\/module\/([^/]+)/);
    return match?.[1] || undefined;
  }, [pathname]);

  // Extract lessonId from URL query parameter: ?lesson=[lessonId]
  const activeLessonId = searchParams.get("lesson") || undefined;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Panel - Course Navigation */}
      <div
        className={`tour-lesson-sidebar shrink-0 border-r border-gray-200 bg-white hidden lg:block overflow-hidden transition-all duration-300 ${
          isCollapsed ? "w-16" : "w-80"
        }`}
      >
        <PeerLearningPanel
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
          activeModuleId={activeModuleId}
          activeLessonId={activeLessonId}
        />
      </div>
      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export default function LearningLayout({ children }: { children: ReactNode }) {
  return (
    <LearningPanelProvider>
      <CourseProgressProvider>
        <LearningLayoutContent>{children}</LearningLayoutContent>
      </CourseProgressProvider>
    </LearningPanelProvider>
  );
}
