"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Room,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
  Track,
} from "livekit-client";

export interface LiveKitMetadata {
  // Course info
  courseId?: string;
  courseTitle?: string;
  // Module info
  moduleId?: string;
  moduleTitle?: string;
  // Lesson info
  lessonId?: string;
  lessonTitle?: string;
  // User profile
  userName?: string;
  userEmail?: string;
  // Session context
  conversationId?: string;
  sessionType?: string; // e.g., "qna", "fa", "general"
  // Custom data
  [key: string]: string | number | boolean | undefined;
}

export interface TranscriptSegment {
  id: string;
  text: string;
  participantIdentity: string;
  isAgent: boolean;
  isFinal: boolean;
  timestamp: number;
}

interface UseLiveKitProps {
  conversationId: string;
  courseId: string;
  userId?: string;
  videoIds?: string[];
  serviceDomain?: string;
  metadata?: LiveKitMetadata;
  /** Auto-connect when the hook mounts */
  autoConnect?: boolean;
  /** Listen-only mode - don't enable microphone, only receive agent audio (text-to-speech) */
  listenOnly?: boolean;
  /** Callback when agent transcript is received */
  onTranscript?: (segment: TranscriptSegment) => void;
}

interface UseLiveKitReturn {
  isConnected: boolean;
  isConnecting: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  error: string | null;
  /** Current agent transcript text (accumulated) */
  agentTranscript: string;
  /** All transcript segments */
  transcriptSegments: TranscriptSegment[];
  /** Whether agent is currently speaking */
  isAgentSpeaking: boolean;
  /** Whether audio playback is blocked by browser autoplay policy */
  isAudioBlocked: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  toggleMute: () => Promise<void>;
  /** Call this after user interaction to enable audio playback */
  startAudio: () => Promise<void>;
  /** Send text message to agent (will be spoken back via TTS) */
  sendTextToAgent: (text: string) => Promise<void>;
}

interface TokenResponse {
  token: string;
  url: string;
  room_name: string;
  participant_name: string;
}

/**
 * Hook to connect to LiveKit voice agent
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
  serviceDomain = "bodh.kpoint.com",
  metadata = {},
  autoConnect = false,
  listenOnly = false,
  onTranscript,
}: UseLiveKitProps): UseLiveKitReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Transcript state
  const [agentTranscript, setAgentTranscript] = useState("");
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isAudioBlocked, setIsAudioBlocked] = useState(false);

  // References to persist across renders
  const roomRef = useRef<Room | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const speakingCounterRef = useRef(0); // Debounce counter for speaking detection
  const hasAutoConnectedRef = useRef(false); // Track if we've already auto-connected
  const isConnectingRef = useRef(false); // Prevent race conditions during async connect
  const roomNameRef = useRef<string | null>(null); // Stable room name across re-renders
  const onTranscriptRef = useRef(onTranscript); // Ref for callback to avoid stale closures
  const metadataRef = useRef(metadata); // Ref for metadata to always use current values

  // Keep refs updated
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    metadataRef.current = metadata;
  }, [metadata]);

  /**
   * Connect to LiveKit room
   */
  const connect = useCallback(async () => {
    // Use ref to prevent race conditions (state updates are async)
    if (isConnectingRef.current || isConnected || roomRef.current) {
      console.log("[LiveKit] Already connecting or connected, skipping");
      return;
    }

    // Set connecting flag immediately via ref
    isConnectingRef.current = true;

    try {
      setIsConnecting(true);
      setError(null);

      // Generate stable room name (only once per session)
      if (!roomNameRef.current) {
        roomNameRef.current = `voice-${conversationId}-${Date.now()}`;
      }
      const roomName = roomNameRef.current;
      console.log("[LiveKit] Starting connection", { roomName, courseId, userId });

      // Get token from local API endpoint
      console.log("[LiveKit] Fetching token from: /api/livekit/token");
      console.log("[LiveKit] Request payload:", { roomName, userId, videoIds });
      // Build metadata payload with course/lesson context
      // Use metadataRef to always get the latest metadata values
      const currentMetadata = metadataRef.current;
      const metadataPayload = {
        course_id: currentMetadata.courseId || courseId,
        course_title: currentMetadata.courseTitle,
        course_description: currentMetadata.courseDescription,
        learning_objectives: currentMetadata.learningObjectives,
        module_id: currentMetadata.moduleId,
        module_title: currentMetadata.moduleTitle,
        lesson_id: currentMetadata.lessonId,
        lesson_title: currentMetadata.lessonTitle,
        user_name: currentMetadata.userName,
        user_email: currentMetadata.userEmail,
        conversation_id: currentMetadata.conversationId || conversationId,
        session_type: currentMetadata.sessionType,
        ...Object.fromEntries(
          Object.entries(currentMetadata).filter(([key]) =>
            !['courseId', 'courseTitle', 'courseDescription', 'learningObjectives', 'moduleId', 'moduleTitle', 'lessonId', 'lessonTitle',
              'userName', 'userEmail', 'conversationId', 'sessionType'].includes(key)
          )
        ),
      };
      console.log("[LiveKit] Session type:", currentMetadata.sessionType);

      const response = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_name: roomName,
          participant_name: userId,
          agent_type: "bodh-agent",
          video_ids: videoIds,
          domain: serviceDomain,
          metadata: metadataPayload,
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
        console.log("[LiveKit] Track subscribed:", {
          kind: track.kind,
          participantIdentity: participant.identity,
          isAgent: participant.isAgent,
          participantName: participant.name,
        });

        // Only handle audio tracks
        if (track.kind !== "audio") {
          console.log("[LiveKit] Skipping non-audio track");
          return;
        }

        // Accept audio from agent OR from any non-local participant (agent might not have isAgent flag)
        const isLocalUser = participant.identity === userId;
        if (isLocalUser) {
          console.log("[LiveKit] Skipping audio from local user");
          return;
        }

        console.log("[LiveKit] Agent audio track received, attaching...");

        // Remove old audio element
        if (audioRef.current) {
          audioRef.current.remove();
        }

        // Create and attach new audio element
        const audio = track.attach() as HTMLAudioElement;
        audio.autoplay = true;
        audio.volume = 1.0;
        document.body.appendChild(audio);

        console.log("[LiveKit] Audio element created:", {
          autoplay: audio.autoplay,
          volume: audio.volume,
          paused: audio.paused,
          muted: audio.muted,
        });

        // Try to play (may need user interaction)
        audio.play()
          .then(() => {
            console.log("[LiveKit] Audio playback started successfully");
            setIsAudioBlocked(false);
          })
          .catch((err) => {
            console.warn("[LiveKit] Audio autoplay blocked:", err);
            setIsAudioBlocked(true);
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

      // Register text stream handler for agent transcriptions (streaming)
      room.registerTextStreamHandler("lk.transcription", async (reader, participantIdentity) => {
        try {
          const info = reader.info;
          const attributes = info?.attributes || {};
          const isFinal = attributes["lk.transcription_final"] === "true";
          const segmentId = attributes["lk.segment_id"] || `seg-${Date.now()}`;
          const transcribedTrackId = attributes["lk.transcribed_track_id"];

          // Check if this is from an agent (has transcribed track ID and is not from local participant)
          const participantId = typeof participantIdentity === "string" ? participantIdentity : participantIdentity.identity;
          const isFromAgent = !!transcribedTrackId && participantId !== userId;

          if (!isFromAgent) {
            // Skip non-agent transcripts
            return;
          }

          // For live streaming, read chunks as they arrive
          let accumulatedText = "";
          setIsAgentSpeaking(true);

          // Stream chunks incrementally using for-await-of
          for await (const chunk of reader) {
            accumulatedText += chunk;

            // Update agentTranscript in real-time for UI display
            setAgentTranscript(accumulatedText);

            // Update transcript in real-time with each chunk
            const segment: TranscriptSegment = {
              id: segmentId,
              text: accumulatedText,
              participantIdentity: participantId,
              isAgent: true,
              isFinal: false, // Still streaming
              timestamp: Date.now(),
            };

            // Update segments state with streaming text
            setTranscriptSegments((prev) => {
              const existing = prev.findIndex((s) => s.id === segmentId);
              if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = segment;
                return updated;
              }
              return [...prev, segment];
            });

            // Call callback for each chunk
            onTranscriptRef.current?.(segment);
          }

          // Stream complete - mark as final
          if (accumulatedText.trim()) {
            const finalSegment: TranscriptSegment = {
              id: segmentId,
              text: accumulatedText,
              participantIdentity: participantId,
              isAgent: true,
              isFinal: true,
              timestamp: Date.now(),
            };

            console.log("[LiveKit] Transcript complete:", {
              participantIdentity: participantId,
              isFinal: true,
              segmentId,
              text: accumulatedText.substring(0, 50) + (accumulatedText.length > 50 ? "..." : ""),
            });

            // Update with final segment
            setTranscriptSegments((prev) => {
              const existing = prev.findIndex((s) => s.id === segmentId);
              if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = finalSegment;
                return updated;
              }
              return [...prev, finalSegment];
            });

            // Accumulate to full transcript only when final
            if (isFinal) {
              setAgentTranscript((prev) => (prev ? prev + " " + accumulatedText : accumulatedText));
            }

            // Call callback with final
            onTranscriptRef.current?.(finalSegment);
          }

          setIsAgentSpeaking(false);
        } catch (err) {
          console.error("[LiveKit] Error processing transcript:", err);
          setIsAgentSpeaking(false);
        }
      });
      console.log("[LiveKit] Registered streaming transcription handler");

      // Enable microphone only if not in listen-only mode
      if (!listenOnly) {
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
      } else {
        console.log("[LiveKit] Listen-only mode - microphone disabled");
        setIsMuted(true); // Mark as muted in listen-only mode
      }

      roomRef.current = room;
      setIsConnected(true);
    } catch (err) {
      console.error("[LiveKit] Connection error:", err);
      setError(err instanceof Error ? err.message : "Connection failed");
      // Reset room name on error so next attempt gets a fresh room
      roomNameRef.current = null;
    } finally {
      setIsConnecting(false);
      isConnectingRef.current = false;
    }
    // Note: Using refs for connection state, so fewer deps needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, courseId, userId, listenOnly]);

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
    setAgentTranscript("");
    setTranscriptSegments([]);
    setIsAgentSpeaking(false);

    // Reset refs for potential reconnection
    roomNameRef.current = null;
    hasAutoConnectedRef.current = false;
    isConnectingRef.current = false;

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

  /**
   * Start audio playback after user interaction (to bypass autoplay policy)
   */
  const startAudio = useCallback(async () => {
    console.log("[LiveKit] startAudio called");

    // Try to start the room's audio context
    if (roomRef.current) {
      try {
        await roomRef.current.startAudio();
        console.log("[LiveKit] Room audio started");
      } catch (err) {
        console.warn("[LiveKit] Failed to start room audio:", err);
      }
    }

    // Also try to play any existing audio element
    if (audioRef.current) {
      try {
        await audioRef.current.play();
        console.log("[LiveKit] Audio element playback started");
        setIsAudioBlocked(false);
      } catch (err) {
        console.error("[LiveKit] Failed to play audio:", err);
      }
    }
  }, []);

  /**
   * Send text message to agent via lk.chat topic
   * Agent will process and respond via TTS
   */
  const sendTextToAgent = useCallback(async (text: string) => {
    if (!roomRef.current) {
      console.warn("[LiveKit] Cannot send text - not connected");
      return;
    }

    if (!text.trim()) {
      console.warn("[LiveKit] Cannot send empty text");
      return;
    }

    console.log("[LiveKit] Sending text to agent:", text.substring(0, 50) + (text.length > 50 ? "..." : ""));

    try {
      // Send text to the lk.chat topic - agent listens for this by default
      await roomRef.current.localParticipant.sendText(text, {
        topic: "lk.chat",
      });
      console.log("[LiveKit] Text sent successfully");
    } catch (err) {
      console.error("[LiveKit] Failed to send text:", err);
      throw err;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Auto-connect on mount if enabled and we have required props (only once)
  useEffect(() => {
    // Use refs to prevent race conditions from React StrictMode double-mounting
    const shouldConnect = autoConnect &&
      conversationId &&
      courseId &&
      !roomRef.current &&
      !isConnectingRef.current &&
      !hasAutoConnectedRef.current;

    console.log("[LiveKit] Auto-connect check:", {
      autoConnect,
      conversationId,
      courseId,
      hasRoom: !!roomRef.current,
      isConnectingRef: isConnectingRef.current,
      hasAutoConnected: hasAutoConnectedRef.current,
      shouldConnect
    });

    if (shouldConnect) {
      console.log("[LiveKit] Auto-connecting...");
      hasAutoConnectedRef.current = true;
      connect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect, conversationId, courseId]);

  return {
    isConnected,
    isConnecting,
    isMuted,
    isSpeaking,
    audioLevel,
    error,
    agentTranscript,
    transcriptSegments,
    isAgentSpeaking,
    isAudioBlocked,
    connect,
    disconnect,
    toggleMute,
    startAudio,
    sendTextToAgent,
  };
}
