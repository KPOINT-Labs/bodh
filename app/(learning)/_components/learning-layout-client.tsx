"use client";

import { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Toaster } from "sonner";

interface LearningLayoutClientProps {
  children: ReactNode;
  sidebar: ReactNode;
}

export function LearningLayoutClient({
  children,
  sidebar,
}: LearningLayoutClientProps) {
  return (
    <SidebarProvider>
      {sidebar}
      <SidebarInset className="flex flex-1 flex-col overflow-hidden">
        {children}
      </SidebarInset>
      <Toaster position="top-right" />
    </SidebarProvider>
  );
}
