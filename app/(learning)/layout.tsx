"use client";

import { ReactNode } from "react";
import { PeerLearningPanel } from "@/components/learning/PeerLearningPanel";

export default function LearningLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Panel - Course Navigation */}
      <div className="w-72 shrink-0 border-r border-gray-200 bg-white hidden lg:block overflow-hidden">
        <PeerLearningPanel />
      </div>
      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}