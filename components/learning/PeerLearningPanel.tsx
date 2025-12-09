import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Users, Send } from "lucide-react";

interface PeerLearningPanelProps {
  className?: string;
}

export function PeerLearningPanel({ className = "" }: PeerLearningPanelProps) {
  return (
    <div className={`flex h-full flex-col ${className}`}>
      {/* Video in Conversation */}
      <div className="p-4">
        <Card className="overflow-hidden bg-slate-900 dark:bg-slate-950">
          <div className="relative aspect-video bg-slate-900 dark:bg-slate-950">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="mb-1 text-2xl text-white">📹</div>
                <p className="text-xs text-white/70">
                  Video in conversation
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Add Comments Section */}
      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm text-foreground">
            Add Comments |
          </p>
          <Send className="h-5 w-5 text-foreground" />
        </div>
      </div>

      <Separator className="mx-4" />

      {/* Peer Learning Space */}
      <div className="flex-1 p-4">
        <Card className="h-full">
          <div className="p-6">
            <p className="text-sm font-medium text-muted-foreground text-center">
              Peer Learning Space
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}