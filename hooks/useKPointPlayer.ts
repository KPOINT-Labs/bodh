"use client";

import { useEffect, useRef, useCallback } from "react";

// KPoint player state constants
const PLAYER_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  REPLAYING: 5,
} as const;

type PlayerState = (typeof PLAYER_STATE)[keyof typeof PLAYER_STATE];

// Type for KPoint player instance
interface KPointPlayer {
  getCurrentTime: () => number;
  getPlayState: () => PlayerState;
  seekTo: (timeInMs: number) => void;
  info: {
    kvideoId: string;
  };
  getBookmarks: () => Array<Record<string, unknown>>;
  events: {
    onStateChange: string;
    timeUpdate: string;
    started: string;
  };
  addEventListener: (event: string, callback: (data: unknown) => void) => void;
  removeEventListener: (event: string, callback: (data: unknown) => void) => void;
}

interface UseKPointPlayerOptions {
  kpointVideoId: string | null | undefined;
  onBookmarksReady?: (bookmarks: Array<Record<string, unknown>>) => void;
  onPlayerReady?: () => void;
}

/**
 * Hook to manage KPoint video player lifecycle
 * Handles player initialization, event subscriptions, and cleanup
 */
export function useKPointPlayer({ kpointVideoId, onBookmarksReady, onPlayerReady }: UseKPointPlayerOptions) {
  const playerRef = useRef<KPointPlayer | null>(null);
  const eventHandlersRef = useRef<Map<string, (data: unknown) => void>>(new Map());
  const kpointVideoIdRef = useRef<string | null>(null);
  // Store callbacks in refs to avoid effect re-runs
  const onBookmarksReadyRef = useRef(onBookmarksReady);
  const onPlayerReadyRef = useRef(onPlayerReady);

  // Keep refs updated
  useEffect(() => {
    onBookmarksReadyRef.current = onBookmarksReady;
    onPlayerReadyRef.current = onPlayerReady;
  });

  // Store kpointVideoId in ref for cleanup
  useEffect(() => {
    kpointVideoIdRef.current = kpointVideoId ?? null;
  }, [kpointVideoId]);

  // Listen for KPoint player ready event - runs only once on mount
  useEffect(() => {
    const handlePlayerStateChange = (data: unknown) => {
      console.log("KPoint player state change:", data);
    };

    const handlePlayerTimeUpdate = (data: unknown) => {
      console.log("KPoint player time update:", data);
    };

    const handlePlayerStarted = (data: unknown) => {
      console.log("KPoint player started:", data);

      // Add delay before getting bookmarks to ensure player is fully initialized
      setTimeout(() => {
        const playerBookmarks = playerRef.current?.getBookmarks();
        console.log("KPoint player bookmarks:", playerBookmarks);

        if (playerBookmarks && Array.isArray(playerBookmarks)) {
          // Filter bookmarks with VISMARK artifact_type
          const vismarkBookmarks = playerBookmarks.filter(
            (bookmark: Record<string, unknown>) =>
              bookmark.artifact_type === "VISMARK" && bookmark.rel_offset
          );

          console.log("VISMARK bookmarks for FA triggering:", vismarkBookmarks);
          onBookmarksReadyRef.current?.(vismarkBookmarks);
        }
      }, 1000);
    };

    const handlePlayerReady = (
      event: CustomEvent<{ message: string; container: unknown; player: KPointPlayer }>
    ) => {
      console.log("KPoint player ready:", event.detail.message);
      const player = event.detail.player;
      playerRef.current = player;

      // Notify parent that player is ready
      onPlayerReadyRef.current?.();

      // Define event handlers
      const handlers: Record<string, (data: unknown) => void> = {
        [player.events.onStateChange]: handlePlayerStateChange,
        [player.events.timeUpdate]: handlePlayerTimeUpdate,
        [player.events.started]: handlePlayerStarted,
      };

      // Subscribe to all events
      Object.entries(handlers).forEach(([event, handler]) => {
        player.addEventListener(event, handler);
        eventHandlersRef.current.set(event, handler);
      });
    };

    document.addEventListener("kpointPlayerReady", handlePlayerReady as EventListener);

    return () => {
      document.removeEventListener("kpointPlayerReady", handlePlayerReady as EventListener);

      // Unsubscribe from all events
      if (playerRef.current) {
        eventHandlersRef.current.forEach((handler, event) => {
          playerRef.current?.removeEventListener(event, handler);
        });
      }
      eventHandlersRef.current.clear();

      // Delete player instance from window
      if (kpointVideoIdRef.current) {
        delete (window as unknown as Record<string, unknown>)[kpointVideoIdRef.current];
      }

      playerRef.current = null;
    };
  }, []); // Empty deps - only run once on mount

  // Seek to a specific time in seconds
  const seekTo = useCallback((seconds: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(seconds * 1000); // Convert to milliseconds
      console.log(`Seeking to ${seconds} seconds`);
      return true;
    }
    return false;
  }, []);

  // Get current playback time in seconds
  const getCurrentTime = useCallback((): number => {
    if (playerRef.current) {
      try {
        const currentTime = playerRef.current.getCurrentTime();
        if (typeof currentTime === "number" && !isNaN(currentTime)) {
          return Math.floor(currentTime);
        }
      } catch (error) {
        console.warn("Failed to get current time from KPoint player:", error);
      }
    }
    return 0;
  }, []);

  // Check if player is ready
  const isPlayerReady = useCallback(() => {
    return playerRef.current !== null;
  }, []);

  return {
    playerRef,
    seekTo,
    getCurrentTime,
    isPlayerReady,
  };
}
