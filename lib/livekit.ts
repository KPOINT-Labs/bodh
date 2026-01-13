/**
 * LiveKit Service Utility
 * Singleton pattern for RoomServiceClient to prevent connection issues during hot reloads
 */

import { RoomServiceClient } from "livekit-server-sdk";

// Helper to convert WebSocket URL to HTTP URL
export function getLiveKitHttpUrl(wsUrl: string): string {
  return wsUrl.replace("wss://", "https://").replace("ws://", "http://");
}

// Singleton pattern for RoomServiceClient (similar to Prisma pattern)
const globalForLiveKit = globalThis as unknown as {
  roomService: RoomServiceClient | undefined;
};

function createRoomServiceClient(): RoomServiceClient {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!url || !apiKey || !apiSecret) {
    throw new Error(
      "Missing LiveKit configuration. Please set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET environment variables."
    );
  }

  return new RoomServiceClient(getLiveKitHttpUrl(url), apiKey, apiSecret);
}

export const roomService =
  globalForLiveKit.roomService ?? createRoomServiceClient();

if (process.env.NODE_ENV !== "production") {
  globalForLiveKit.roomService = roomService;
}

// Export credentials for AccessToken creation
export function getLiveKitCredentials() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const url = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !url) {
    throw new Error(
      "Missing LiveKit configuration. Please set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET environment variables."
    );
  }

  return { apiKey, apiSecret, url };
}
