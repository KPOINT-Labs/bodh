/**
 * LiveKit Room Management Endpoints
 * POST /api/livekit/room - Create room
 * GET /api/livekit/room - List rooms
 */

import { RoomAgentDispatch } from "@livekit/protocol";
import { type NextRequest, NextResponse } from "next/server";
import { roomService } from "@/lib/livekit";
import type {
  CreateRoomRequest,
  CreateRoomResponse,
  ListRoomsResponse,
  RoomMetadata,
} from "@/types/livekit";

/**
 * Create a new LiveKit room
 * POST /api/livekit/room
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateRoomRequest;

    // Generate room name if not provided
    const roomName =
      body.room_name ||
      `bodh-${Date.now()}-${Math.floor(Math.random() * 10_000)
        .toString()
        .padStart(4, "0")}`;

    console.log(`[API_CREATE_ROOM] Creating room: ${roomName}`);

    // Prepare room metadata
    const metadata: RoomMetadata = {
      agent_type: body.agent_type || "bodh-agent",
    };

    if (body.domain) {
      metadata.domain = body.domain;
    }

    if (body.video_ids) {
      metadata.video_ids = body.video_ids;
    }

    console.log("[API_CREATE_ROOM] Room metadata prepared:", metadata);

    try {
      // Create the room with agent dispatch
      const room = await roomService.createRoom({
        name: roomName,
        metadata: JSON.stringify(metadata),
        maxParticipants: body.max_participants || 10,
        emptyTimeout: body.empty_timeout || 600, // 10 minutes
        agents: [new RoomAgentDispatch({ agentName: "bodh-agent" })],
      });

      console.log(
        `[API_CREATE_ROOM] Successfully created room: ${room.name} (SID: ${room.sid})`
      );

      const response: CreateRoomResponse = {
        room_name: room.name,
        room_sid: room.sid,
        status: "created",
      };

      return NextResponse.json(response);
    } catch (createError) {
      // Room might already exist - update its metadata instead
      console.warn(
        "[API_CREATE_ROOM] Room creation failed (may already exist):",
        createError
      );
      console.log(
        `[API_CREATE_ROOM] Attempting to update metadata for existing room '${roomName}'`
      );

      try {
        const room = await roomService.updateRoomMetadata(
          roomName,
          JSON.stringify(metadata)
        );

        console.log(
          `[API_CREATE_ROOM] Updated metadata for existing room '${room.name}'`
        );

        const response: CreateRoomResponse = {
          room_name: room.name,
          room_sid: room.sid,
          status: "updated",
        };

        return NextResponse.json(response);
      } catch (updateError) {
        console.error(
          "[API_CREATE_ROOM] Failed to update room metadata:",
          updateError
        );
        return NextResponse.json(
          {
            error: `Failed to create or update room: ${updateError instanceof Error ? updateError.message : "Unknown error"}`,
          },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error("[API_CREATE_ROOM] Error creating room:", error);
    return NextResponse.json(
      {
        error: `Failed to create room: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}

/**
 * List active LiveKit rooms
 * GET /api/livekit/room
 */
export async function GET() {
  try {
    console.log("[API_LIST_ROOMS] Listing active rooms");

    const rooms = await roomService.listRooms();

    const roomList = rooms.map((room) => {
      let roomMetadata: Record<string, unknown> = {};

      if (room.metadata) {
        try {
          roomMetadata = JSON.parse(room.metadata);
        } catch {
          console.warn(
            `[API_LIST_ROOMS] Invalid JSON in room metadata for ${room.name}`
          );
        }
      }

      return {
        name: room.name,
        sid: room.sid,
        num_participants: room.numParticipants,
        creation_time: Number(room.creationTime),
        metadata: roomMetadata,
      };
    });

    console.log(`[API_LIST_ROOMS] Found ${roomList.length} active rooms`);

    const response: ListRoomsResponse = {
      rooms: roomList,
      total: roomList.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[API_LIST_ROOMS] Error listing rooms:", error);
    return NextResponse.json(
      {
        error: `Failed to list rooms: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
