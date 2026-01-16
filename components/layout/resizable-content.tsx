"use client";

import { ReactNode, useState, useEffect } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MoreVertical } from "lucide-react";

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
      <div className="h-full overflow-hidden bg-[#F4F4F4]">
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
    <div className="h-full overflow-hidden bg-[#F4F4F4]">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Main Content Panel */}
        <ResizablePanel
          defaultSize={rightPanel ? 25 : 100}
          minSize={25}
          className="flex flex-col"
          style={{
            backgroundImage: 'url(/background.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
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
            <ResizableHandle
              withHandle
              className="hidden lg:flex w-px bg-transparent relative"
            >
              <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 flex items-center">
                <div className="bg-blue-50 border-blue-200 z-10 flex h-6 w-4 items-center justify-center rounded-sm border shadow-sm hover:shadow-md hover:bg-blue-100 transition-all duration-200">
                  <MoreVertical className="h-3 w-3 text-blue-400" />
                </div>
              </div>
            </ResizableHandle>
            <ResizablePanel
              defaultSize={25}
              minSize={30}
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