"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { type ReactNode, useMemo } from "react";
import { PeerLearningPanel } from "@/components/learning/PeerLearningPanel";
import { CourseProgressProvider } from "@/contexts/CourseProgressContext";
import {
  LearningPanelProvider,
  useLearningPanel,
} from "@/contexts/LearningPanelContext";

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
        className={`tour-lesson-sidebar hidden shrink-0 overflow-hidden border-gray-200 border-r bg-white transition-all duration-300 lg:block ${
          isCollapsed ? "w-16" : "w-80"
        }`}
      >
        <PeerLearningPanel
          activeLessonId={activeLessonId}
          activeModuleId={activeModuleId}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
        />
      </div>
      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
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
