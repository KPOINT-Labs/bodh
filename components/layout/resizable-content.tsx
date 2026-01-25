"use client";

import { MoreVertical } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
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

export function ResizableContent({
  header,
  content,
  footer,
  rightPanel,
}: ResizableContentProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="h-full overflow-hidden bg-[#F4F4F4]">
        <div className="flex h-full">
          {/* Main Content Panel - Static Layout */}
          <div className="flex flex-1 flex-col">
            {/* Fixed Header */}
            <div className="shrink-0">{header}</div>

            {/* Scrollable Content */}
            <ScrollArea className="h-0 flex-1">{content}</ScrollArea>

            {/* Fixed Footer */}
            <div className="shrink-0">{footer}</div>
          </div>

          {/* Right Panel - Only rendered when there's content */}
          {rightPanel && (
            <div className="hidden w-1/4 min-w-[20%] max-w-[60%] lg:block">
              {rightPanel}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden bg-[#F4F4F4]">
      <ResizablePanelGroup className="h-full" direction="horizontal">
        {/* Main Content Panel */}
        <ResizablePanel
          className="flex flex-col"
          defaultSize={rightPanel ? 65 : 100}
          minSize={40}
          style={{
            backgroundImage: "url(/background.png)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          {/* Fixed Header */}
          <div className="shrink-0">{header}</div>

          {/* Scrollable Content */}
          <ScrollArea className="h-0 flex-1">{content}</ScrollArea>

          {/* Fixed Footer */}
          <div className="shrink-0">{footer}</div>
        </ResizablePanel>

        {/* Right Panel - Only rendered when there's content */}
        {rightPanel && (
          <>
            <ResizableHandle
              className="relative hidden w-px bg-transparent lg:flex"
              withHandle
            >
              <div className="absolute inset-y-0 left-1/2 flex -translate-x-1/2 transform items-center">
                <div className="z-10 flex h-6 w-4 items-center justify-center rounded-sm border border-blue-200 bg-blue-50 shadow-sm transition-all duration-200 hover:bg-blue-100 hover:shadow-md">
                  <MoreVertical className="h-3 w-3 text-blue-400" />
                </div>
              </div>
            </ResizableHandle>
            <ResizablePanel
              className="hidden lg:block"
              defaultSize={35}
              maxSize={60}
              minSize={25}
            >
              {rightPanel}
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
