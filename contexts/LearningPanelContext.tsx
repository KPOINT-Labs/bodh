"use client";

import { parseAsBoolean, parseAsString, useQueryState } from "nuqs";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface LearningPanelContextType {
  // Sidebar (local state - not in URL)
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  collapseSidebar: () => void;
  expandSidebar: () => void;

  // Right Panel (nuqs URL state)
  isRightPanelOpen: boolean;
  openRightPanel: () => void;
  closeRightPanel: () => void;
  toggleRightPanel: () => void;

  // Lesson Selection (nuqs URL state)
  selectedLessonId: string | null;
  setSelectedLessonId: (id: string | null) => void;

  // Highlight Animation
  highlightRightPanel: boolean;
  triggerRightPanelHighlight: () => void;

  // Deprecated (backward compat)
  /** @deprecated Use isSidebarCollapsed */
  isCollapsed: boolean;
  /** @deprecated Use toggleSidebar */
  toggleCollapse: () => void;
  /** @deprecated Use collapseSidebar */
  collapsePanel: () => void;
  /** @deprecated Use expandSidebar */
  expandPanel: () => void;
}

const LearningPanelContext = createContext<LearningPanelContextType | null>(
  null
);

export function LearningPanelProvider({ children }: { children: ReactNode }) {
  // Sidebar - local state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Right Panel - nuqs URL state
  const [isRightPanelOpen, setIsRightPanelOpen] = useQueryState(
    "panel",
    parseAsBoolean.withDefault(false).withOptions({ shallow: true })
  );

  // Lesson Selection - nuqs URL state
  const [selectedLessonId, setSelectedLessonId] = useQueryState(
    "lesson",
    parseAsString.withOptions({ shallow: true })
  );

  // Highlight animation - local state
  const [highlightRightPanel, setHighlightRightPanel] = useState(false);

  // Auto-open panel when lesson is selected
  useEffect(() => {
    if (selectedLessonId && !isRightPanelOpen) {
      setIsRightPanelOpen(true);
    }
  }, [selectedLessonId, isRightPanelOpen, setIsRightPanelOpen]);

  // Sidebar actions
  const toggleSidebar = useCallback(
    () => setIsSidebarCollapsed((prev) => !prev),
    []
  );
  const collapseSidebar = useCallback(() => setIsSidebarCollapsed(true), []);
  const expandSidebar = useCallback(() => setIsSidebarCollapsed(false), []);

  // Right Panel actions
  const openRightPanel = useCallback(
    () => setIsRightPanelOpen(true),
    [setIsRightPanelOpen]
  );
  const closeRightPanel = useCallback(() => {
    setIsRightPanelOpen(false);
    setSelectedLessonId(null);
  }, [setIsRightPanelOpen, setSelectedLessonId]);
  const toggleRightPanel = useCallback(
    () => setIsRightPanelOpen((prev) => !prev),
    [setIsRightPanelOpen]
  );

  // Highlight actions
  const triggerRightPanelHighlight = useCallback(
    () => setHighlightRightPanel(true),
    []
  );
  useEffect(() => {
    if (highlightRightPanel) {
      const timer = setTimeout(() => setHighlightRightPanel(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [highlightRightPanel]);

  const value = useMemo<LearningPanelContextType>(
    () => ({
      isSidebarCollapsed,
      toggleSidebar,
      collapseSidebar,
      expandSidebar,
      isRightPanelOpen: isRightPanelOpen ?? false,
      openRightPanel,
      closeRightPanel,
      toggleRightPanel,
      selectedLessonId,
      setSelectedLessonId,
      highlightRightPanel,
      triggerRightPanelHighlight,
      // Deprecated aliases
      isCollapsed: isSidebarCollapsed,
      toggleCollapse: toggleSidebar,
      collapsePanel: collapseSidebar,
      expandPanel: expandSidebar,
    }),
    [
      isSidebarCollapsed,
      toggleSidebar,
      collapseSidebar,
      expandSidebar,
      isRightPanelOpen,
      openRightPanel,
      closeRightPanel,
      toggleRightPanel,
      selectedLessonId,
      setSelectedLessonId,
      highlightRightPanel,
      triggerRightPanelHighlight,
    ]
  );

  return (
    <LearningPanelContext.Provider value={value}>
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
