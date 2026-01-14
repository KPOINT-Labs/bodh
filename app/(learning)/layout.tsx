"use client";

import { ReactNode, useMemo } from "react";
import { usePathname } from "next/navigation";
import { PeerLearningPanel } from "@/components/learning/PeerLearningPanel";
import { LearningPanelProvider, useLearningPanel } from "@/contexts/LearningPanelContext";

function LearningLayoutContent({ children }: { children: ReactNode }) {
  const { isCollapsed, toggleCollapse } = useLearningPanel();
  const pathname = usePathname();

  // Extract moduleId from URL pattern: /course/[courseId]/module/[moduleId]
  const activeModuleId = useMemo(() => {
    const match = pathname?.match(/\/course\/[^/]+\/module\/([^/]+)/);
    return match?.[1] || undefined;
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Panel - Course Navigation */}
      <div
        className={`shrink-0 border-r border-gray-200 bg-white hidden lg:block overflow-hidden transition-all duration-300 ${
          isCollapsed ? "w-16" : "w-80"
        }`}
      >
        <PeerLearningPanel
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
          activeModuleId={activeModuleId}
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
      <LearningLayoutContent>{children}</LearningLayoutContent>
    </LearningPanelProvider>
  );
}
