"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface LearningPanelContextType {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  collapsePanel: () => void;
  expandPanel: () => void;
  highlightRightPanel: boolean;
  triggerRightPanelHighlight: () => void;
}

const LearningPanelContext = createContext<LearningPanelContextType | null>(
  null
);

export function LearningPanelProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [highlightRightPanel, setHighlightRightPanel] = useState(false);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const collapsePanel = useCallback(() => {
    setIsCollapsed(true);
  }, []);

  const expandPanel = useCallback(() => {
    setIsCollapsed(false);
  }, []);

  // Trigger a brief highlight on the right panel
  const triggerRightPanelHighlight = useCallback(() => {
    setHighlightRightPanel(true);
  }, []);

  // Auto-clear highlight after animation completes
  useEffect(() => {
    if (highlightRightPanel) {
      const timer = setTimeout(() => {
        setHighlightRightPanel(false);
      }, 1000); // 1 second highlight duration
      return () => clearTimeout(timer);
    }
  }, [highlightRightPanel]);

  return (
    <LearningPanelContext.Provider
      value={{
        isCollapsed,
        toggleCollapse,
        collapsePanel,
        expandPanel,
        highlightRightPanel,
        triggerRightPanelHighlight,
      }}
    >
      {children}
    </LearningPanelContext.Provider>
  );
}

export function useLearningPanel() {
  const context = useContext(LearningPanelContext);
  if (!context) {
    throw new Error(
      "useLearningPanel must be used within a LearningPanelProvider"
    );
  }
  return context;
}
