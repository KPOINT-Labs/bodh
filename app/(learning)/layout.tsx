"use client";

import { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { CourseSidebar } from "@/components/navigation/course-sidebar";

export default function LearningLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <CourseSidebar />
      <SidebarInset className="flex flex-1 flex-col overflow-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}