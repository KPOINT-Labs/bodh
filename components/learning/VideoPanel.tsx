"use client";

import { X } from "lucide-react";
import { KPointVideoPlayer } from "@/components/video/KPointVideoPlayer";

interface Lesson {
  id: string;
  title: string;
  orderIndex: number;
  kpointVideoId?: string | null;
}

interface VideoPanelProps {
  lesson: Lesson;
  highlightPanel: boolean;
  startOffset: number | null;
  onClose: () => void;
}

export function VideoPanel({
  lesson,
  highlightPanel,
  startOffset,
  onClose,
}: VideoPanelProps) {
  if (!lesson.kpointVideoId) {
    return null;
  }

  return (
    <div
      className={`flex h-full flex-col bg-white p-4 transition-all duration-300 ${
        highlightPanel
          ? "bg-purple-50 ring-5 ring-purple-500 ring-opacity-75"
          : ""
      }`}
      data-tour="video-panel"
    >
      <div
        className={`relative overflow-hidden rounded-2xl border-2 bg-background shadow-xl transition-all duration-300 ${
          highlightPanel
            ? "scale-[1.02] border-purple-400 shadow-purple-300/60"
            : "border-blue-200 hover:border-blue-400 hover:shadow-blue-300/40"
        }`}
      >
        <button
          className="absolute top-3 right-3 z-10 cursor-pointer rounded-xl bg-gray-900/80 p-2 text-white shadow-lg transition-colors hover:bg-gray-900"
          onClick={onClose}
          title="Close video panel"
          type="button"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="aspect-video">
          <KPointVideoPlayer
            kpointVideoId={lesson.kpointVideoId}
            startOffset={startOffset}
          />
        </div>

        <div className="p-3">
          <h3 className="line-clamp-2 font-medium text-foreground text-xs">
            Lesson {lesson.orderIndex + 1}: {lesson.title}
          </h3>
        </div>
      </div>
    </div>
  );
}
