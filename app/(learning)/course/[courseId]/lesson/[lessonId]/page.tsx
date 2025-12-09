import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ResizableContent } from "@/components/layout/resizable-content";
import { LessonHeader } from "@/components/course/LessonHeader";
import { CourseDescription } from "@/components/course/CourseDescription";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { VideoStatus } from "@/components/video/VideoStatus";
import { InteractiveCard } from "@/components/course/InteractiveCard";
import { ChatInput } from "@/components/chat/ChatInput";
import { PeerLearningPanel } from "@/components/learning/PeerLearningPanel";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;

  const header = (
    <LessonHeader
      courseTitle="Computational Thinking"
      lessonObjective="Learning Objective"
    />
  );

  const content = (
    <div className="space-y-6 p-6">
      {/* AI Assistant Message */}
      <Card className="border-l-4 border-l-primary bg-primary/5 p-4">
        <p className="text-sm text-muted-foreground">
          I'll be right here whenever you need help—whether it's clarifying
          a concept, checking your understanding, or simply exploring ideas.
        </p>
      </Card>

      {/* Course Description */}
      <CourseDescription
        title="Computational Thinking"
        description="This course helps you organize your thinking so you can break down problems into clear, step-by-step solutions — the foundation you need before writing any code."
        learningObjectives={[
          "How to structure your thought process systematically",
          "How to identify 'patterns' that apply across different problems",
          "How computers use these patterns to solve tasks efficiently"
        ]}
        analogy="Think of it like giving clear instructions to a new team member, or following a recipe — one logical step at a time."
        currentSection="Lecture 1"
      />

      {/* Video Player Placeholder */}
      <div>
        <VideoPlayer videoId={lessonId} title="KPoint Video Player" />
        <VideoStatus isPlaying={true} status="Video is playing" />
      </div>

      {/* Interactive Content Sections */}
      <InteractiveCard
        title="Quick Recap"
        description="Let's quickly recap what we learned in the last session before diving into new concepts."
        actions={[
          { label: "Recap", variant: "outline" },
          { label: "Continue to new topic", variant: "default" }
        ]}
      />

      <Separator />

      <InteractiveCard
        title="Pattern Recognition"
        description="Can you identify the pattern in this sequence?"
        actions={[
          { label: "A) Linear", variant: "outline" },
          { label: "B) Exponential", variant: "outline" },
          { label: "C) Recursive", variant: "outline" }
        ]}
      />

      <InteractiveCard
        title="Deep Dive: Algorithms"
        description="Let's explore how computational thinking applies to real-world problem solving."
      >
        <div className="space-y-4">
          <p className="text-sm">
            Consider this everyday problem: You're planning the most efficient route to visit multiple stores in your city. This is actually a classic computational problem called the "Traveling Salesman Problem."
          </p>
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-xs font-medium mb-2">Think about it:</p>
            <ul className="text-xs space-y-1 list-disc ml-4">
              <li>How would you break this down into steps?</li>
              <li>What patterns can you identify?</li>
              <li>How would you optimize your solution?</li>
            </ul>
          </div>
        </div>
      </InteractiveCard>

      <InteractiveCard
        title="Reflection Exercise"
        description="Take a moment to reflect on what you've learned so far."
      >
        <div className="space-y-4">
          <p className="text-sm">
            Computational thinking isn't just about computers - it's a fundamental way of approaching and solving problems that can be applied to any field.
          </p>
          <p className="text-sm">
            Whether you're planning a dinner party, organizing your schedule, or solving complex business challenges, the principles we're learning here will help you think more systematically and effectively.
          </p>
        </div>
      </InteractiveCard>
    </div>
  );

  const footer = (
    <ChatInput
      placeholder="Tap to talk"
    />
  );

  const rightPanel = (
    <PeerLearningPanel />
  );

  return (
    <ResizableContent
      header={header}
      content={content}
      footer={footer}
      rightPanel={rightPanel}
    />
  );
}