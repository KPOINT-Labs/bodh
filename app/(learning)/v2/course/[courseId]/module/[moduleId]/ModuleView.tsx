"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  useRoomContext,
} from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { updateRoomMetadata } from "@/actions/livekit";
import type { SessionTypeResult } from "@/actions/session-type";
import { ResizableContent } from "@/components/layout/resizable-content";
import { useAudioContext } from "@/contexts/AudioContext";
import { useLearningPanel } from "@/contexts/LearningPanelContext";
import { ChatInput } from "./components/ChatInput";
import { ChatPanel } from "./components/ChatPanel";
import { ModuleHeader } from "./components/ModuleHeader";
import { VideoPanel } from "./components/VideoPanel";
import { ActionsProvider } from "./providers/ActionsProvider";
import { MessagesProvider } from "./providers/MessagesProvider";
import { ModuleProvider } from "./providers/ModuleProvider";

// Types
interface Lesson {
  id: string;
  title: string;
  orderIndex: number;
  kpointVideoId?: string | null;
  youtubeVideoId?: string | null;
  description?: string | null;
  duration?: number;
  quiz?: unknown;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description?: string | null;
  learningObjectives?: string[];
}

interface ModuleViewProps {
  course: Course;
  module: Module;
  userId: string;
  userName: string;
  roomName: string;
  liveKitToken: string;
  sessionType: SessionTypeResult;
}

// LiveKit URL - passed from server or use env
const LIVEKIT_URL =
  process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://prism-zfwz4oir.livekit.cloud";

export function ModuleView({
  course,
  module,
  userId,
  userName,
  roomName,
  liveKitToken,
  sessionType,
}: ModuleViewProps) {
  // Panel state from context (URL-synced via nuqs)
  const {
    isRightPanelOpen,
    closeRightPanel,
    selectedLessonId,
    highlightRightPanel,
    collapseSidebar,
    expandSidebar,
  } = useLearningPanel();

  // Derive active lesson from URL state
  const sortedLessons = useMemo(
    () => [...module.lessons].sort((a, b) => a.orderIndex - b.orderIndex),
    [module.lessons]
  );

  const activeLesson = useMemo(() => {
    if (selectedLessonId) {
      return (
        sortedLessons.find((l) => l.id === selectedLessonId) || sortedLessons[0]
      );
    }
    return sortedLessons[0];
  }, [selectedLessonId, sortedLessons]);

  // Auto-collapse sidebar when video panel opens
  useEffect(() => {
    if (isRightPanelOpen && activeLesson?.kpointVideoId) {
      collapseSidebar();
    } else if (!isRightPanelOpen) {
      expandSidebar();
    }
  }, [
    isRightPanelOpen,
    activeLesson?.kpointVideoId,
    collapseSidebar,
    expandSidebar,
  ]);

  // Handle panel close
  const handleClosePanel = useCallback(() => {
    closeRightPanel();
  }, [closeRightPanel]);

  // Handle action completion (update message status)
  const handleActionHandled = useCallback(
    (_messageId: string, _buttonId: string) => {
      // TODO: Update message action status via useMessages
    },
    []
  );

  return (
    <ModuleProvider
      course={course}
      module={module}
      sessionType={sessionType}
      userId={userId}
    >
      <ActionsProvider onActionHandled={handleActionHandled}>
        <LiveKitRoom
          audio={false}
          className="h-full"
          connect={true}
          options={{
            adaptiveStream: true,
            dynacast: true,
          }}
          serverUrl={LIVEKIT_URL}
          token={liveKitToken}
          video={false}
        >
          <RoomAudioRenderer />
          <AudioPlaybackHandler />
          <MessagesProvider>
            <RoomMetadataUpdater
              activeLesson={activeLesson}
              course={course}
              module={module}
              roomName={roomName}
              sessionType={sessionType}
            />
            <ModuleLayout
              activeLesson={activeLesson}
              highlightRightPanel={highlightRightPanel}
              isRightPanelOpen={isRightPanelOpen}
              onClosePanel={handleClosePanel}
            />
          </MessagesProvider>
        </LiveKitRoom>
      </ActionsProvider>
    </ModuleProvider>
  );
}

// Component to handle browser autoplay restrictions and global mute sync
function AudioPlaybackHandler() {
  const room = useRoomContext();
  const { isMuted, registerMuteCallback, unregisterMuteCallback } =
    useAudioContext();
  const [canPlayAudio, setCanPlayAudio] = useState(true);

  // Listen for audio playback status changes from LiveKit
  useEffect(() => {
    if (!room) return;

    const handleAudioStatus = () => {
      setCanPlayAudio(room.canPlaybackAudio);
      console.log(
        "[AudioPlaybackHandler] canPlaybackAudio:",
        room.canPlaybackAudio
      );
    };

    // Set initial state
    setCanPlayAudio(room.canPlaybackAudio);

    room.on(RoomEvent.AudioPlaybackStatusChanged, handleAudioStatus);
    return () => {
      room.off(RoomEvent.AudioPlaybackStatusChanged, handleAudioStatus);
    };
  }, [room]);

  // Auto-start audio on first user interaction if blocked
  useEffect(() => {
    if (canPlayAudio || !room) return;

    const handleInteraction = async () => {
      try {
        await room.startAudio();
        console.log("[AudioPlaybackHandler] Audio started after user click");
        document.removeEventListener("click", handleInteraction);
        document.removeEventListener("touchstart", handleInteraction);
      } catch (err) {
        console.error("[AudioPlaybackHandler] Failed to start audio:", err);
      }
    };

    document.addEventListener("click", handleInteraction);
    document.addEventListener("touchstart", handleInteraction);

    return () => {
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
    };
  }, [canPlayAudio, room]);

  // Sync global mute state with LiveKit audio output
  useEffect(() => {
    if (!room) return;

    const handleMuteChange = (muted: boolean) => {
      console.log("[AudioPlaybackHandler] Mute state changed:", muted);
      // Mute/unmute all remote audio tracks via publication
      for (const participant of room.remoteParticipants.values()) {
        for (const publication of participant.audioTrackPublications.values()) {
          // setEnabled on publication controls server-side streaming
          publication.setEnabled(!muted);
        }
      }
    };

    // Apply initial mute state
    handleMuteChange(isMuted);

    registerMuteCallback(handleMuteChange);
    return () => unregisterMuteCallback(handleMuteChange);
  }, [room, isMuted, registerMuteCallback, unregisterMuteCallback]);

  return null;
}

// Separate component to update room metadata when lesson changes
function RoomMetadataUpdater({
  roomName,
  course,
  module,
  activeLesson,
  sessionType,
}: {
  roomName: string;
  course: Course;
  module: Module;
  activeLesson: Lesson | undefined;
  sessionType: SessionTypeResult;
}) {
  const prevLessonIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Only update if lesson actually changed (not on first render)
    if (
      prevLessonIdRef.current &&
      prevLessonIdRef.current !== activeLesson?.id
    ) {
      const newMetadata = {
        courseId: course.id,
        courseTitle: course.title,
        moduleId: module.id,
        moduleTitle: module.title,
        lessonId: activeLesson?.id,
        lessonTitle: activeLesson?.title,
        videoIds: activeLesson?.kpointVideoId
          ? [activeLesson.kpointVideoId]
          : [],
        learningObjectives: course.learningObjectives,
        sessionType: sessionType.sessionType,
      };

      updateRoomMetadata(roomName, newMetadata).catch((err) =>
        console.error("[RoomMetadataUpdater] Failed to update metadata:", err)
      );
    }

    prevLessonIdRef.current = activeLesson?.id;
  }, [
    activeLesson?.id,
    activeLesson?.title,
    activeLesson?.kpointVideoId,
    roomName,
    course,
    module,
    sessionType,
  ]);

  return null;
}

// Layout orchestration component using real components
function ModuleLayout({
  activeLesson,
  isRightPanelOpen,
  highlightRightPanel,
  onClosePanel,
}: {
  activeLesson: Lesson | undefined;
  isRightPanelOpen: boolean;
  highlightRightPanel: boolean;
  onClosePanel: () => void;
}) {
  const header = <ModuleHeader />;

  const content = <ChatPanel />;

  const footer = <ChatInput />;

  const rightPanel =
    isRightPanelOpen && activeLesson?.kpointVideoId ? (
      <VideoPanel
        highlightPanel={highlightRightPanel}
        lesson={activeLesson}
        onClose={onClosePanel}
      />
    ) : null;

  return (
    <ResizableContent
      content={content}
      footer={footer}
      header={header}
      rightPanel={rightPanel}
    />
  );
}
