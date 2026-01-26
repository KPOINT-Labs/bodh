"use client";

import { useEffect, useRef } from "react";

interface KPointVideoPlayerProps {
  kpointVideoId: string;
  className?: string;
  startOffset?: number | null; // Start offset in seconds
  serviceDomain?: string;
}

export function KPointVideoPlayer({
  kpointVideoId,
  className = "",
  startOffset,
  serviceDomain = "bodh.kpoint.com",
}: KPointVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Build video params with optional start offset (convert seconds to milliseconds)
  const videoParams = JSON.stringify({
    autoplay: false,
    ...(startOffset ? { offset: startOffset * 1000 } : {}),
  });

  useEffect(() => {
    // Re-initialize the player when the video ID changes
    // The KPoint script looks for data-init-dynamic-internal elements
    if (containerRef.current && typeof window !== "undefined") {
      // Trigger re-initialization if the KPoint player script is already loaded
      const kpointPlayer = (
        window as unknown as { kpointPlayer?: { init?: () => void } }
      ).kpointPlayer;
      if (kpointPlayer?.init) {
        kpointPlayer.init();
      }
    }
  }, []);

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <style global jsx>{`
        .player-wrapper,
        .player-wrapper > div,
        .kpoint-player,
        .kp,
        .player-overlay {
          overflow: hidden !important;
        }
      `}</style>
      <div
        data-init-dynamic-internal=""
        data-kvideo-id={kpointVideoId}
        data-player={kpointVideoId}
        data-video-host={serviceDomain}
        data-video-params={videoParams}
        key={kpointVideoId}
        ref={containerRef}
        style={{ width: "100%", overflow: "hidden" }}
      />
    </div>
  );
}
