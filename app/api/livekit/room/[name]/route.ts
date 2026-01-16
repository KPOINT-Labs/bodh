/**
 * LiveKit Room Delete Endpoint
 * DELETE /api/livekit/room/[name] - Delete room
 */

import { NextRequest, NextResponse } from "next/server";
import { roomService } from "@/lib/livekit";
import type { DeleteRoomResponse } from "@/types/livekit";

interface RouteParams {
  params: Promise<{ name: string }>;
}

/**
 * Delete a LiveKit room
 * DELETE /api/livekit/room/[name]
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { name: roomName } = await params;

    if (!roomName) {
      return NextResponse.json(
        { error: "Room name is required" },
        { status: 400 }
      );
    }

    console.log(`[API_DELETE_ROOM] Deleting room: ${roomName}`);

    await roomService.deleteRoom(roomName);

    console.log(`[API_DELETE_ROOM] Successfully deleted room: ${roomName}`);

    const response: DeleteRoomResponse = {
      status: "deleted",
      room_name: roomName,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[API_DELETE_ROOM] Error deleting room:", error);
    return NextResponse.json(
      {
        error: `Failed to delete room: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
