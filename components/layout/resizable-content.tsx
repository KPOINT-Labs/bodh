"use client";

import { ReactNode, useState, useEffect } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ResizableContentProps {
  header: ReactNode;
  content: ReactNode;
  footer: ReactNode;
  rightPanel?: ReactNode | null;
}

export function ResizableContent({ header, content, footer, rightPanel }: ResizableContentProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="h-screen overflow-hidden bg-[#F4F4F4]">
        <div className="flex h-full">
          {/* Main Content Panel - Static Layout */}
          <div className="flex-1 flex flex-col">
            {/* Fixed Header */}
            <div className="shrink-0">
              {header}
            </div>

            {/* Scrollable Content */}
            <ScrollArea className="flex-1 h-0">
              {content}
            </ScrollArea>

            {/* Fixed Footer */}
            <div className="shrink-0">
              {footer}
            </div>
          </div>

          {/* Right Panel - Only rendered when there's content */}
          {rightPanel && (
            <div className="hidden lg:block w-1/4 min-w-[20%] max-w-[60%]">
              {rightPanel}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[#F4F4F4]">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Main Content Panel */}
        <ResizablePanel defaultSize={rightPanel ? 75 : 100} minSize={50} className="flex flex-col">
          {/* Fixed Header */}
          <div className="shrink-0">
            {header}
          </div>

          {/* Scrollable Content */}
          <ScrollArea className="flex-1 h-0">
            {content}
          </ScrollArea>

          {/* Fixed Footer */}
          <div className="shrink-0">
            {footer}
          </div>
        </ResizablePanel>

        {/* Right Panel - Only rendered when there's content */}
        {rightPanel && (
          <>
            <ResizableHandle className="hidden lg:block" />
            <ResizablePanel
              defaultSize={25}
              minSize={20}
              maxSize={60}
              className="hidden lg:block"
            >
              {rightPanel}
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}