"use client";

import { ReactNode } from "react";
import { PeerLearningPanel } from "@/components/learning/PeerLearningPanel";
import { LearningPanelProvider, useLearningPanel } from "@/contexts/LearningPanelContext";

function LearningLayoutContent({ children }: { children: ReactNode }) {
  const { isCollapsed, toggleCollapse } = useLearningPanel();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Panel - Course Navigation */}
      <div
        className={`shrink-0 border-r border-gray-200 bg-white hidden lg:block overflow-hidden transition-all duration-300 ${
          isCollapsed ? "w-16" : "w-72"
        }`}
      >
        <PeerLearningPanel
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
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
