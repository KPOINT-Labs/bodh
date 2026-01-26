"use client";

import { cn } from "@/lib/utils";
import { useModuleContext } from "../providers/ModuleProvider";

interface ModuleHeaderProps {
  className?: string;
}

export function ModuleHeader({ className }: ModuleHeaderProps) {
  const { course, module } = useModuleContext();

  return (
    <div className={cn("border-b bg-white p-4", className)}>
      <h1 className="font-semibold text-gray-900 text-lg">{course.title}</h1>
      <p className="text-muted-foreground text-sm">{module.title}</p>
    </div>
  );
}
