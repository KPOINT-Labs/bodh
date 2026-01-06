"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface LearningPanelContextType {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  collapsePanel: () => void;
  expandPanel: () => void;
}

const LearningPanelContext = createContext<LearningPanelContextType | null>(null);

export function LearningPanelProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const collapsePanel = useCallback(() => {
    setIsCollapsed(true);
  }, []);

  const expandPanel = useCallback(() => {
    setIsCollapsed(false);
  }, []);

  return (
    <LearningPanelContext.Provider
      value={{ isCollapsed, toggleCollapse, collapsePanel, expandPanel }}
    >
      {children}
    </LearningPanelContext.Provider>
  );
}

export function useLearningPanel() {
  const context = useContext(LearningPanelContext);
  if (!context) {
    throw new Error("useLearningPanel must be used within a LearningPanelProvider");
  }
  return context;
}
