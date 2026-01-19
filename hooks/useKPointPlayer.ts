"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { updateLessonProgress } from "@/lib/actions/lesson-progress";
import { useCourseProgress } from "@/contexts/CourseProgressContext";

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
  getDuration?: () => number; // Duration in milliseconds
  getPlayState: () => PlayerState;
  seekTo: (timeInMs: number) => void;
  setState?: (state: PlayerState) => void;
  pauseVideo?: () => void;
  playVideo?: () => void;
  info: {
    kvideoId: string;
  };
  config?: {
    kapsuleinfo?: {
      published_duration?: number; // Duration in seconds
    };
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

interface Bookmark {
  id: string;
  rel_offset: number; // milliseconds
  artifact_type: string;
  text?: string; // Topic/title of the bookmark
  [key: string]: unknown;
}

interface UseKPointPlayerOptions {
  kpointVideoId: string | null | undefined;
  userId?: string;
  lessonId?: string;
  videoDuration?: number;
  onBookmarksReady?: (bookmarks: Bookmark[]) => void;
  onPlayerReady?: () => void;
  onFATrigger?: (message: string, timestampSeconds: number, topic?: string, pauseVideo?: boolean) => Promise<void>;
  onVideoEnd?: () => void;
}

/**
 * Hook to manage KPoint video player lifecycle
 * Handles player initialization, event subscriptions, and cleanup
 */
export function useKPointPlayer({ kpointVideoId, userId, lessonId, videoDuration, onBookmarksReady, onPlayerReady, onFATrigger, onVideoEnd }: UseKPointPlayerOptions) {
  const playerRef = useRef<KPointPlayer | null>(null);
  const eventHandlersRef = useRef<Map<string, (data: unknown) => void>>(new Map());
  const kpointVideoIdRef = useRef<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const triggeredBookmarksRef = useRef<Set<string>>(new Set());
  const isPlayingRef = useRef(false);
  const bookmarksRef = useRef<Bookmark[]>([]);

  // Context for optimistic progress updates
  const { updateLessonProgress: updateLessonProgressContext } = useCourseProgress();

  // Progress tracking
  const lastProgressUpdateRef = useRef<number>(0);
  const PROGRESS_UPDATE_INTERVAL = 15000; // 15 seconds
  const actualVideoDurationRef = useRef<number>(videoDuration || 0); // Actual duration in seconds, updated from player

  // DEBUG: Log when hook is initialized with progress tracking params
  console.log("[useKPointPlayer] Initialized with params:", {
    kpointVideoId,
    userId,
    lessonId,
    videoDuration,
    hasProgressTracking: !!(userId && lessonId && videoDuration),
  });
  
  // Store callbacks in refs to avoid effect re-runs
  const onBookmarksReadyRef = useRef(onBookmarksReady);
  const onPlayerReadyRef = useRef(onPlayerReady);
  const onFATriggerRef = useRef(onFATrigger);
  const onVideoEndRef = useRef(onVideoEnd);

  // Keep refs updated
  useEffect(() => {
    onBookmarksReadyRef.current = onBookmarksReady;
    onPlayerReadyRef.current = onPlayerReady;
    onFATriggerRef.current = onFATrigger;
    onVideoEndRef.current = onVideoEnd;
  });
  
  // Keep state refs updated
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  
  useEffect(() => {
    bookmarksRef.current = bookmarks;
  }, [bookmarks]);

  // Store kpointVideoId in ref for cleanup and reset state when video changes/removed
  useEffect(() => {
    kpointVideoIdRef.current = kpointVideoId ?? null;

    // Reset playing state when video is removed (kpointVideoId becomes null/undefined)
    if (!kpointVideoId) {
      setIsPlaying(false);
      playerRef.current = null;
    }
  }, [kpointVideoId]);

  // Internal function to check for FA triggers with explicit bookmarks parameter
  const checkForFATriggersInternal = useCallback((currentTimeMs: number, currentBookmarks: Bookmark[]) => {
    for (const bookmark of currentBookmarks) {
      const bookmarkId = bookmark.id || `${bookmark.rel_offset}`;
      
      // Skip if already triggered
      if (triggeredBookmarksRef.current.has(bookmarkId)) {
        continue;
      }
      
      // Check if we've reached or passed the bookmark time (within 500ms tolerance)
      const timeDiff = currentTimeMs - bookmark.rel_offset;
      
      if (timeDiff >= 0 && timeDiff <= 500) {
        console.log(`FA Trigger: Bookmark at ${bookmark.rel_offset}ms (${(bookmark.rel_offset / 1000).toFixed(1)}s)`);
        
        // Mark as triggered
        triggeredBookmarksRef.current.add(bookmarkId);
        
        // Pause the video
        if (playerRef.current) {
          try {
            if (playerRef.current.pauseVideo) {
              playerRef.current.pauseVideo();
            } else if (playerRef.current.setState) {
              playerRef.current.setState(PLAYER_STATE.PAUSED);
            }
            setIsPlaying(false);
          } catch (error) {
            console.error('Failed to pause video:', error);
          }
        }
        
        // Trigger FA with message, timestamp, and topic from bookmark
        const message = "Ask me a formative assessment";
        const timestampSeconds = bookmark.rel_offset / 1000; // Convert milliseconds to seconds
        const topic = bookmark.text; // Topic from bookmark (e.g., "Introduction to Computational Thinking")
        onFATriggerRef.current?.(message, timestampSeconds, topic, true).catch(error => {
          console.error('FA trigger failed:', error);
          // Resume video on error
          if (playerRef.current) {
            try {
              if (playerRef.current.playVideo) {
                playerRef.current.playVideo();
              } else if (playerRef.current.setState) {
                playerRef.current.setState(PLAYER_STATE.PLAYING);
              }
              setIsPlaying(true);
            } catch (playError) {
              console.error('Failed to resume video:', playError);
            }
          }
        });
        
        break; // Only trigger one at a time
      }
    }
  }, []);

  // Helper to get video duration from player
  const getVideoDurationFromPlayer = useCallback((player: KPointPlayer): number => {
    // Try getDuration() first (returns milliseconds)
    if (player.getDuration) {
      const durationMs = player.getDuration();
      if (durationMs > 0) {
        const durationSec = durationMs / 1000;
        console.log("[useKPointPlayer] Got duration from getDuration():", durationSec, "seconds");
        return durationSec;
      }
    }

    // Fallback to config.kapsuleinfo.published_duration (returns seconds)
    if (player.config?.kapsuleinfo?.published_duration) {
      const durationSec = player.config.kapsuleinfo.published_duration;
      console.log("[useKPointPlayer] Got duration from config.kapsuleinfo.published_duration:", durationSec, "seconds");
      return durationSec;
    }

    console.warn("[useKPointPlayer] Could not get duration from player");
    return 0;
  }, []);

  // Progress update helper
  const updateProgress = useCallback(async (currentTimeSec: number, videoEnded: boolean) => {
    const currentVideoDuration = actualVideoDurationRef.current;

    if (!userId || !lessonId || !currentVideoDuration) {
      console.warn("[useKPointPlayer] updateProgress called but missing params:", {
        userId: !!userId,
        lessonId: !!lessonId,
        videoDuration: currentVideoDuration,
      });
      return;
    }

    const completionPercentage = Math.min((currentTimeSec / currentVideoDuration) * 100, 100);

    console.log("[useKPointPlayer] Calling updateLessonProgress server action:", {
      userId,
      lessonId,
      lastPosition: Math.floor(currentTimeSec),
      completionPercentage: Math.round(completionPercentage),
      videoEnded,
      videoDuration: currentVideoDuration,
    });

    try {
      await updateLessonProgress({
        userId,
        lessonId,
        lastPosition: Math.floor(currentTimeSec),
        completionPercentage: Math.round(completionPercentage),
        videoEnded,
      });
      console.log("[useKPointPlayer] Progress updated successfully");

      // Optimistically update context for immediate sidebar refresh
      updateLessonProgressContext(
        lessonId,
        Math.round(completionPercentage),
        videoEnded
      );
    } catch (error) {
      console.error("[useKPointPlayer] Failed to update lesson progress:", error);
      // Silent failure - don't disrupt user experience
    }
  }, [userId, lessonId, updateLessonProgressContext]);

  // Listen for KPoint player ready event - runs only once on mount
  useEffect(() => {
    const handlePlayerStateChange = (event: unknown) => {
      // KPoint passes { data: number, target: Player } - extract state from event.data
      const eventObj = event as { data: number };
      const stateValue = eventObj.data;
      console.log("KPoint player state change:", stateValue);

      // Update playing state
      const nowPlaying = stateValue === PLAYER_STATE.PLAYING;
      setIsPlaying(nowPlaying);

      // Save progress on pause
      if (stateValue === PLAYER_STATE.PAUSED && playerRef.current) {
        const currentTimeSec = playerRef.current.getCurrentTime() / 1000;
        updateProgress(currentTimeSec, false);
      }

      // Detect video end and trigger callback
      if (stateValue === PLAYER_STATE.ENDED) {
        console.log("KPoint video ENDED, triggering onVideoEnd callback");
        if (playerRef.current) {
          const currentTimeSec = playerRef.current.getCurrentTime() / 1000;
          updateProgress(currentTimeSec, true);
        }
        onVideoEndRef.current?.();
      }
    };

    const handlePlayerTimeUpdate = () => {
      if (!playerRef.current) return;

      const currentTimeMs = playerRef.current.getCurrentTime();
      const currentTimeSec = currentTimeMs / 1000;

      // Get current values from refs (not stale closure values)
      const currentBookmarks = bookmarksRef.current;
      const currentIsPlaying = isPlayingRef.current;

      // Check for FA triggers on time update
      if (currentBookmarks.length > 0 && currentIsPlaying) {
        checkForFATriggersInternal(currentTimeMs, currentBookmarks);
      }

      // Update progress every 15 seconds
      const currentVideoDuration = actualVideoDurationRef.current;
      if (userId && lessonId && currentVideoDuration && currentIsPlaying) {
        const now = Date.now();
        const timeSinceLastUpdate = now - lastProgressUpdateRef.current;

        // DEBUG: Log progress tracking decision
        if (timeSinceLastUpdate >= PROGRESS_UPDATE_INTERVAL) {
          console.log("[useKPointPlayer] Time to update progress:", {
            currentTimeSec,
            timeSinceLastUpdate,
            userId,
            lessonId,
            videoDuration: currentVideoDuration,
          });
          lastProgressUpdateRef.current = now;
          updateProgress(currentTimeSec, false);
        }
      } else {
        // DEBUG: Log why progress tracking is skipped (only once per minute to avoid spam)
        const now = Date.now();
        if (!currentIsPlaying) {
          // Silent - video not playing
        } else if ((!userId || !lessonId || !currentVideoDuration) && now - lastProgressUpdateRef.current > 60000) {
          console.warn("[useKPointPlayer] Progress tracking skipped - missing params:", {
            userId: !!userId,
            lessonId: !!lessonId,
            videoDuration: currentVideoDuration,
          });
          lastProgressUpdateRef.current = now; // Update to avoid spam
        }
      }
    };

    const handlePlayerStarted = (data: unknown) => {
      console.log("KPoint player started:", data);

      // Set playing state when player starts
      setIsPlaying(true);

      // Add delay before getting bookmarks to ensure player is fully initialized
      setTimeout(() => {
        if (!playerRef.current) return;

        // Get video duration from player
        const duration = getVideoDurationFromPlayer(playerRef.current);
        if (duration > 0) {
          actualVideoDurationRef.current = duration;
          console.log("[useKPointPlayer] Updated actualVideoDurationRef to:", duration, "seconds");
        }

        const playerBookmarks = playerRef.current.getBookmarks();
        console.log("KPoint player bookmarks:", playerBookmarks);

        if (playerBookmarks && Array.isArray(playerBookmarks)) {
          // Filter bookmarks with VISMARK artifact_type
          const vismarkBookmarks = playerBookmarks.filter(
            (bookmark: Record<string, unknown>) =>
              bookmark.artifact_type === "VISMARK" && bookmark.rel_offset
          ) as Bookmark[];

          console.log("VISMARK bookmarks for FA triggering:", vismarkBookmarks);
          setBookmarks(vismarkBookmarks);
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
        const currentTimeMs = playerRef.current.getCurrentTime();
        if (typeof currentTimeMs === "number" && !isNaN(currentTimeMs)) {
          return Math.floor(currentTimeMs / 1000); // Convert milliseconds to seconds
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
  ;
  
  // Get current playing state
  const getIsPlaying = useCallback(() => {
    return isPlaying;
  }, [isPlaying]);

  return {
    playerRef,
    seekTo,
    getCurrentTime,
    isPlayerReady,
    isPlaying,
    getIsPlaying,
    bookmarks,
  };
}
