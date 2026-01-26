"use client";

import { ChatInput } from "@/components/chat/ChatInput";
import { LessonHeader } from "@/components/course/LessonHeader";
import { ResizableContent } from "@/components/layout/resizable-content";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { MessageBubble } from "@/components/ui/message-bubble";
import { mockTourData } from "@/lib/mockTourData";

interface Course {
  id: string;
  title: string;
  description?: string | null;
  learningObjectives?: string[];
}

interface Module {
  id: string;
  title: string;
  lessons: { id: string; title: string; orderIndex: number }[];
}

interface TourModeContentProps {
  course: Course;
  module: Module;
  userId: string;
}

/**
 * Simplified content for tour/demo mode.
 * Displays mock data without real LiveKit/database interactions.
 */
export function TourModeContent({
  course,
  module,
  userId,
}: TourModeContentProps) {
  const header = (
    <LessonHeader courseTitle={course.title} moduleTitle={module.title} />
  );

  const content = (
    <div className="space-y-6 pb-3">
      <div className="tour-chat-area">
        {mockTourData.chatMessages.map((message) => (
          <MessageBubble
            content={message.content}
            enableAnimation={false}
            key={message.id}
            type={message.type}
          />
        ))}
      </div>
    </div>
  );

  const footer = (
    <ChatInput
      conversationId={undefined}
      courseId={course.id}
      isLoading={false}
      liveKitState={{
        isConnected: false,
        isConnecting: false,
        isMuted: false,
        isSpeaking: false,
        audioLevel: 0,
        error: null,
        agentTranscript: "",
        transcriptSegments: [],
        isAgentSpeaking: false,
        isAudioBlocked: false,
        isWaitingForAgentResponse: false,
        isVoiceModeEnabled: false,
        userTranscript: "",
        isUserSpeaking: false,
        connect: async () => {},
        disconnect: async () => {},
        toggleMute: async () => {},
        startAudio: async () => {},
        sendTextToAgent: async () => {},
        clearAgentTranscript: () => {},
        enableVoiceMode: async () => false,
        disableVoiceMode: async () => false,
        clearUserTranscript: () => {},
      }}
      onAddUserMessage={() => {}}
      placeholder="Ask me anything about this lesson..."
      userId={userId}
      videoIds={[]}
    />
  );

  const rightPanel = (
    <div className="tour-video-panel flex h-full flex-col bg-white p-4">
      <div className="overflow-hidden rounded-2xl border-2 border-blue-200 bg-background shadow-xl">
        <div className="flex aspect-video items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="mb-2 text-4xl">🎥</div>
            <div className="font-semibold text-gray-700 text-lg">
              {mockTourData.videoPlaceholder.title}
            </div>
            <div className="mt-1 text-gray-500 text-sm">
              {mockTourData.videoPlaceholder.description}
            </div>
          </div>
        </div>
        <div className="p-3">
          <h3 className="font-medium text-foreground text-xs">
            {mockTourData.videoPlaceholder.title}
          </h3>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <AnimatedBackground intensity="medium" theme="learning" variant="full" />
      <ResizableContent
        content={content}
        footer={footer}
        header={header}
        rightPanel={rightPanel}
      />
    </>
  );
}
