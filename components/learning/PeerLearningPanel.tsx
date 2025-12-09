import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Users } from "lucide-react";

interface PeerLearningPanelProps {
  className?: string;
}

export function PeerLearningPanel({ className = "" }: PeerLearningPanelProps) {
  return (
    <div className={`flex h-full flex-col bg-muted/30 ${className}`}>
      {/* Right Panel Header */}
      <div className="border-b bg-background px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Add Comments</span>
        </div>
      </div>

      {/* Video in Conversation */}
      <div className="p-4">
        <Card className="overflow-hidden">
          <div className="relative aspect-video bg-muted/50">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="mb-1 text-2xl">📹</div>
                <p className="text-xs text-muted-foreground">
                  Video in conversation
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Separator />

      {/* Peer Learning Space */}
      <div className="flex-1 p-4">
        <div className="rounded-lg border bg-background p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium">Peer Learning Space</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Connect with other students taking this course. Share insights and ask questions together.
          </p>
        </div>
      </div>
    </div>
  );
}