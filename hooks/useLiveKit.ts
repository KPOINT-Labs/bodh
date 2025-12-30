"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Room, Track, RemoteParticipant } from "livekit-client";

// Prism API base URL
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
    if (isConnecting || isConnected) return;

    try {
      setIsConnecting(true);
      setError(null);

      // Generate unique room name
      const roomName = `voice-${conversationId}-${Date.now()}`;

      // Get token from Prism backend
      console.log("Getting voice token...");
      const response = await fetch(`${PRISM_API_URL}/api/v1/voice-agent/token`, {
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
        throw new Error("Failed to get voice token");
      }

      const { token, url } = (await response.json()) as TokenResponse;

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
      const handleAgentAudio = (track: Track, participant: RemoteParticipant) => {
        if (track.kind !== "audio" || !participant.isAgent) {
          return;
        }

        console.log("Agent audio received");

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
      room.on("disconnected", () => {
        console.log("Disconnected from room");
        setIsConnected(false);
      });

      // Connect to room
      console.log("Connecting to LiveKit room...");
      await room.connect(url, token);
      console.log("Connected!");

      // Enable microphone
      console.log("Enabling microphone...");
      await room.localParticipant.setMicrophoneEnabled(true);
      console.log("Microphone enabled");

      roomRef.current = room;
      setIsConnected(true);
    } catch (err) {
      console.error("LiveKit connection error:", err);
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setIsConnecting(false);
    }
  }, [conversationId, courseId, userId, isConnecting, isConnected]);

  /**
   * Disconnect from LiveKit room
   */
  const disconnect = useCallback(async () => {
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
