"use client";

import { useEffect, useRef } from "react";

interface KPointVideoPlayerProps {
  kpointVideoId: string;
  className?: string;
  startOffset?: number | null; // Start offset in seconds
}

export function KPointVideoPlayer({
  kpointVideoId,
  className = "",
  startOffset,
}: KPointVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Build video params with optional start offset
  const videoParams = JSON.stringify({
    autoplay: true,
    ...(startOffset ? { start: startOffset } : {}),
  });

  useEffect(() => {
    // Re-initialize the player when the video ID changes
    // The KPoint script looks for data-init-dynamic-internal elements
    if (containerRef.current && typeof window !== "undefined") {
      // Trigger re-initialization if the KPoint player script is already loaded
      const kpointPlayer = (window as unknown as { kpointPlayer?: { init?: () => void } }).kpointPlayer;
      if (kpointPlayer?.init) {
        kpointPlayer.init();
      }
    }
  }, [kpointVideoId, startOffset]);

  return (
    <div
      className={`w-full rounded-xl overflow-hidden ${className}`}
      style={{ borderRadius: "12px" }}
    >
      <style jsx global>{`
        .player-wrapper,
        .player-wrapper > div,
        .kpoint-player,
        .kp,
        .player-overlay {
          border-radius: 12px !important;
          overflow: hidden !important;
        }
      `}</style>
      <div
        ref={containerRef}
        key={kpointVideoId}
        data-init-dynamic-internal=""
        data-video-host="bodh.kpoint.com"
        data-kvideo-id={kpointVideoId}
        data-player={kpointVideoId}
        data-video-params={videoParams}
        style={{ width: "100%", borderRadius: "12px", overflow: "hidden" }}
      />
    </div>
  );
}
