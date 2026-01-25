"use server";

import { AccessToken, type VideoGrant } from "livekit-server-sdk";
import { getLiveKitCredentials, roomService } from "@/lib/livekit";

interface RoomMetadata {
  agent_type?: string;
  courseId?: string;
  courseTitle?: string;
  moduleId?: string;
  moduleTitle?: string;
  lessonId?: string;
  lessonTitle?: string;
  lessonNumber?: number;
  videoIds?: string[];
  learningObjectives?: string[];
  userId?: string;
  userName?: string;
  sessionType?: string;
  isFirstCourseVisit?: boolean;
  isIntroLesson?: boolean;
  prevLessonTitle?: string | null;
  [key: string]: unknown;
}

interface GetLiveKitTokenParams {
  roomName: string;
  participantName: string;
  metadata?: RoomMetadata;
}

export async function getLiveKitToken({
  roomName,
  participantName,
  metadata = {},
}: GetLiveKitTokenParams): Promise<string | null> {
  try {
    const { apiKey, apiSecret } = getLiveKitCredentials();

    // Create or update room with metadata
    try {
      await roomService.createRoom({
        name: roomName,
        metadata: JSON.stringify(metadata),
        emptyTimeout: 600,
      });
    } catch {
      // Room exists - update metadata
      await roomService.updateRoomMetadata(roomName, JSON.stringify(metadata));
    }

    // Create access token
    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      name: participantName,
      metadata: JSON.stringify(metadata),
    });

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    } as VideoGrant);

    return await token.toJwt();
  } catch (error) {
    console.error("[getLiveKitToken] Error:", error);
    return null;
  }
}

export async function updateRoomMetadata(
  roomName: string,
  metadata: RoomMetadata
): Promise<void> {
  try {
    await roomService.updateRoomMetadata(roomName, JSON.stringify(metadata));
  } catch (error) {
    console.error("[updateRoomMetadata] Error:", error);
  }
}
