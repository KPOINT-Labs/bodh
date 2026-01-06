"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Room,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
  Track,
} from "livekit-client";

// Prism API base URL (must use NEXT_PUBLIC_ prefix for client-side access)
const PRISM_API_URL = process.env.NEXT_PUBLIC_PRISM_API_URL || "https://prism-prod.kpoint.ai";

interface UseLiveKitProps {
  conversationId: string;
  courseId: string;
  userId?: string;
  videoIds?: string[];
}

interface UseLiveKitReturn {
  isConnected: boolean;
  isConnecting: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  toggleMute: () => Promise<void>;
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
  videoIds = [],
}: UseLiveKitProps): UseLiveKitReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // References to persist across renders
  const roomRef = useRef<Room | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const speakingCounterRef = useRef(0); // Debounce counter for speaking detection

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
      console.log("[LiveKit] Fetching token from:", `${PRISM_API_URL}/api/v1/bodh/token`);
      console.log("[LiveKit] Request payload:", { roomName, userId, videoIds });
      const response = await fetch(`${PRISM_API_URL}/api/v1/bodh/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_name: roomName,
          participant_name: userId,
          user_id: userId,
          agent_type: "qna-agent",
          video_ids: videoIds,
          domain: "bodh.kpoint.com",
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

      // Set up audio level monitoring
      const micTrack = room.localParticipant.getTrackPublication(Track.Source.Microphone);
      if (micTrack?.track) {
        const mediaStream = new MediaStream([micTrack.track.mediaStreamTrack]);
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(mediaStream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        // Start monitoring audio levels
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const SPEAKING_THRESHOLD = 0.15; // Higher threshold to filter noise
        const DEBOUNCE_FRAMES = 5; // Require consistent signal for N frames

        const monitorAudio = () => {
          if (!analyserRef.current) return;

          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          const normalizedLevel = Math.min(average / 128, 1); // Normalize to 0-1

          setAudioLevel(normalizedLevel);

          // Debounced speaking detection to prevent rapid toggling
          if (normalizedLevel > SPEAKING_THRESHOLD) {
            speakingCounterRef.current = Math.min(speakingCounterRef.current + 1, DEBOUNCE_FRAMES + 1);
          } else {
            speakingCounterRef.current = Math.max(speakingCounterRef.current - 1, 0);
          }

          // Only change state after consistent readings
          const shouldBeSpeaking = speakingCounterRef.current >= DEBOUNCE_FRAMES;
          setIsSpeaking(shouldBeSpeaking);

          animationFrameRef.current = requestAnimationFrame(monitorAudio);
        };
        monitorAudio();
        console.log("[LiveKit] Audio level monitoring started");
      }

      roomRef.current = room;
      setIsConnected(true);
    } catch (err) {
      console.error("[LiveKit] Connection error:", err);
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setIsConnecting(false);
    }
  }, [conversationId, courseId, userId, videoIds, isConnecting, isConnected]);

  /**
   * Disconnect from LiveKit room
   */
  const disconnect = useCallback(async () => {
    // Only log and cleanup if there's an active connection
    if (!roomRef.current && !audioRef.current) {
      return; // Nothing to disconnect
    }

    console.log("[LiveKit] Disconnecting...");

    // Stop audio level monitoring
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;

    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.remove();
      audioRef.current = null;
    }

    setIsConnected(false);
    setIsMuted(false);
    setIsSpeaking(false);
    setAudioLevel(0);
    setError(null);
    console.log("[LiveKit] Disconnected and cleaned up");
  }, []);

  /**
   * Toggle microphone mute/unmute
   */
  const toggleMute = useCallback(async () => {
    if (!roomRef.current) {
      console.warn("[LiveKit] Cannot toggle mute - not connected");
      return;
    }

    const newMutedState = !isMuted;
    console.log("[LiveKit] Toggling mute:", newMutedState ? "muting" : "unmuting");

    try {
      await roomRef.current.localParticipant.setMicrophoneEnabled(!newMutedState);
      setIsMuted(newMutedState);
      console.log("[LiveKit] Microphone", newMutedState ? "muted" : "unmuted");
    } catch (err) {
      console.error("[LiveKit] Failed to toggle mute:", err);
    }
  }, [isMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    isMuted,
    isSpeaking,
    audioLevel,
    error,
    connect,
    disconnect,
    toggleMute,
  };
}
