"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Room,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
} from "livekit-client";

// Prism API base URL (must use NEXT_PUBLIC_ prefix for client-side access)
const PRISM_API_URL = process.env.NEXT_PUBLIC_PRISM_API_URL || "https://prism-prod.kpoint.ai";

interface UseLiveKitProps {
  conversationId: string;
  courseId: string;
  userId?: string;
}

interface UseLiveKitReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

interface TokenResponse {
  token: string;
  url: string;
  room_name: string;
  participant_name: string;
}

/**
 * Simple hook to connect to LiveKit voice agent via Prism backend
 *
 * Usage:
 *   const { isConnected, isConnecting, connect, disconnect } = useLiveKit({
 *     conversationId: "xxx",
 *     courseId: "yyy"
 *   });
 */
export function useLiveKit({
  conversationId,
  courseId,
  userId = "anonymous",
}: UseLiveKitProps): UseLiveKitReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // References to persist across renders
  const roomRef = useRef<Room | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /**
   * Connect to LiveKit room
   */
  const connect = useCallback(async () => {
    if (isConnecting || isConnected) {
      console.log("[LiveKit] Already connecting or connected, skipping");
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      // Generate unique room name
      const roomName = `voice-${conversationId}-${Date.now()}`;
      console.log("[LiveKit] Starting connection", { roomName, courseId, userId });

      // Get token from Prism backend
      console.log("[LiveKit] Fetching token from:", `${PRISM_API_URL}/api/v1/adi2/token`);
      const response = await fetch(`${PRISM_API_URL}/api/v1/adi2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_name: roomName,
          participant_name: userId,
          user_id: userId,
          agent_type: "qna-agent",
          video_ids: [],
          domain: courseId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[LiveKit] Token fetch failed:", response.status, errorText);
        throw new Error(`Failed to get voice token: ${response.status}`);
      }

      const { token, url } = (await response.json()) as TokenResponse;
      console.log("[LiveKit] Token received, connecting to:", url);

      // Create room with good audio settings
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Handle incoming audio from agent
      const handleAgentAudio = (
        track: RemoteTrack,
        _publication: RemoteTrackPublication,
        participant: RemoteParticipant
      ) => {
        if (track.kind !== "audio" || !participant.isAgent) {
          console.log("[LiveKit] Track received but skipping:", { kind: track.kind, isAgent: participant.isAgent });
          return;
        }

        console.log("[LiveKit] Agent audio track received");

        // Remove old audio element
        if (audioRef.current) {
          audioRef.current.remove();
        }

        // Create and attach new audio element
        const audio = track.attach() as HTMLAudioElement;
        audio.autoplay = true;
        audio.volume = 1.0;
        document.body.appendChild(audio);

        // Try to play (may need user interaction)
        audio.play().catch((err) => {
          console.warn("Audio autoplay blocked:", err);
        });

        audioRef.current = audio;
      };

      // Listen for agent audio
      room.on("trackSubscribed", handleAgentAudio);

      // Listen for disconnect
      room.on("disconnected", (reason) => {
        console.log("[LiveKit] Disconnected from room:", reason);
        setIsConnected(false);
      });

      // Connect to room
      await room.connect(url, token);
      console.log("[LiveKit] Connected to room successfully");

      // Enable microphone
      await room.localParticipant.setMicrophoneEnabled(true);
      console.log("[LiveKit] Microphone enabled");

      roomRef.current = room;
      setIsConnected(true);
    } catch (err) {
      console.error("[LiveKit] Connection error:", err);
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setIsConnecting(false);
    }
  }, [conversationId, courseId, userId, isConnecting, isConnected]);

  /**
   * Disconnect from LiveKit room
   */
  const disconnect = useCallback(async () => {
    // Only log and cleanup if there's an active connection
    if (!roomRef.current && !audioRef.current) {
      return; // Nothing to disconnect
    }

    console.log("[LiveKit] Disconnecting...");
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.remove();
      audioRef.current = null;
    }

    setIsConnected(false);
    setError(null);
    console.log("[LiveKit] Disconnected and cleaned up");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
  };
}
