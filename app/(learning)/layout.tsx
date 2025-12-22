import { ReactNode } from "react";
import { LearningLayoutClient } from "./_components/learning-layout-client";
import { CourseSidebarWrapper } from "@/components/navigation/course-sidebar-wrapper";

export default function LearningLayout({ children }: { children: ReactNode }) {
  return (
    <LearningLayoutClient sidebar={<CourseSidebarWrapper />}>
      {children}
    </LearningLayoutClient>
  );
}