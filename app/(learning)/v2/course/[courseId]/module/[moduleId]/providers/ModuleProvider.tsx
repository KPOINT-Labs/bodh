"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";

// Session type result (will be imported from actions/session-type.ts in Task 11)
// For now, define inline
interface SessionTypeResult {
  sessionType: "warmup" | "lesson" | "revision";
  reason: string;
}

interface Lesson {
  id: string;
  title: string;
  orderIndex: number;
  kpointVideoId?: string | null;
  youtubeVideoId?: string | null;
  description?: string | null;
  duration?: number;
  quiz?: unknown;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description?: string | null;
  learningObjectives?: string[];
}

interface ModuleContextType {
  course: Course;
  module: Module;
  userId: string;
  sessionType: SessionTypeResult;
}

const ModuleContext = createContext<ModuleContextType | null>(null);

interface ModuleProviderProps {
  children: ReactNode;
  course: Course;
  module: Module;
  userId: string;
  sessionType: SessionTypeResult;
}

export function ModuleProvider({
  children,
  course,
  module,
  userId,
  sessionType,
}: ModuleProviderProps) {
  const value = useMemo(
    () => ({ course, module, userId, sessionType }),
    [course, module, userId, sessionType]
  );

  return (
    <ModuleContext.Provider value={value}>{children}</ModuleContext.Provider>
  );
}

export function useModuleContext() {
  const context = useContext(ModuleContext);
  if (!context) {
    throw new Error("useModuleContext must be used within ModuleProvider");
  }
  return context;
}
