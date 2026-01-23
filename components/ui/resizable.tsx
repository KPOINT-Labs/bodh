"use client";

import { MoreVerticalIcon } from "lucide-react";
import type * as React from "react";
import * as ResizablePrimitive from "react-resizable-panels";

import { cn } from "@/lib/utils";

function ResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) {
  return (
    <ResizablePrimitive.PanelGroup
      className={cn(
        "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
        className
      )}
      data-slot="resizable-panel-group"
      {...props}
    />
  );
}

function ResizablePanel({
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Panel>) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />;
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean;
}) {
  return (
    <ResizablePrimitive.PanelResizeHandle
      className={cn(
        "relative flex w-1 cursor-col-resize items-center justify-center bg-blue-100 transition-all duration-150 after:absolute after:inset-y-0 after:left-1/2 after:w-3 after:-translate-x-1/2 hover:w-0.5 hover:bg-blue-400 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-blue-400 focus-visible:ring-offset-1 active:bg-blue-500 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:translate-x-0 data-[panel-group-direction=vertical]:after:-translate-y-1/2 [&[data-panel-group-direction=vertical]>div]:rotate-90",
        className
      )}
      data-slot="resizable-handle"
      {...props}
    >
      {withHandle && (
        <div className="z-10 flex h-6 w-4 items-center justify-center rounded-sm border border-blue-200 bg-blue-50 shadow-sm transition-all duration-200 hover:bg-blue-100 hover:shadow-md">
          <MoreVerticalIcon className="size-3 text-blue-400 transition-colors duration-200 hover:text-blue-500" />
        </div>
      )}
    </ResizablePrimitive.PanelResizeHandle>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
