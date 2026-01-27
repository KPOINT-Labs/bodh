/**
 * LiveKit Token Generation Endpoint
 * POST /api/livekit/token
 *
 * Generates LiveKit access tokens for voice chat rooms.
 * Replicates functionality from prism/app/api/endpoints/adi2.py
 */

import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import type { VideoGrant } from "livekit-server-sdk";
import { roomService, getLiveKitCredentials } from "@/lib/livekit";
import type { TokenRequest, TokenResponse, RoomMetadata } from "@/types/livekit";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TokenRequest;

    // Validate required parameters
    if (!body.room_name || typeof body.room_name !== "string") {
      return NextResponse.json(
        { error: "room_name is required and must be a string" },
        { status: 400 }
      );
    }

    if (!body.participant_name || typeof body.participant_name !== "string") {
      return NextResponse.json(
        { error: "participant_name is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate optional parameters
    if (body.video_ids && !Array.isArray(body.video_ids)) {
      return NextResponse.json(
        { error: "video_ids must be a list" },
        { status: 400 }
      );
    }

    if (
      body.video_ids &&
      !body.video_ids.every((vid) => typeof vid === "string" && vid.trim())
    ) {
      return NextResponse.json(
        { error: "All video_ids must be non-empty strings" },
        { status: 400 }
      );
    }

    if (body.domain && typeof body.domain !== "string") {
      return NextResponse.json(
        { error: "domain must be a string" },
        { status: 400 }
      );
    }

    if (body.domain && !body.domain.trim()) {
      return NextResponse.json(
        { error: "domain cannot be empty" },
        { status: 400 }
      );
    }

    console.log(
      `[API_TOKEN] Generating token for participant: ${body.participant_name} in room: ${body.room_name}`
    );

    // Log incoming metadata for debugging
    console.log(`[API_TOKEN] Received body.metadata:`, JSON.stringify(body.metadata, null, 2));
    if (body.metadata) {
      console.log(`[API_TOKEN] learning_objectives from metadata: ${body.metadata.learning_objectives}`);
      console.log(`[API_TOKEN] course_title from metadata: ${body.metadata.course_title}`);
      console.log(`[API_TOKEN] session_type from metadata: ${body.metadata.session_type}`);
    }

    // Prepare room metadata with filtering parameters
    const metadata: RoomMetadata = {
      agent_type: body.agent_type || "bodh-agent",
    };

    if (body.domain) {
      metadata.domain = body.domain.trim();
    }

    if (body.video_ids) {
      metadata.video_ids = body.video_ids.map((vid) => vid.trim());
    }

    // Add interview-specific metadata
    if (body.role) {
      metadata.role = body.role.trim();
    }

    if (body.interview_type) {
      metadata.interview_type = body.interview_type.trim();
    }

    if (body.resume_context) {
      metadata.resume_context = body.resume_context.trim();
    }

    // Merge any additional metadata from request
    if (body.metadata) {
      Object.assign(metadata, body.metadata);
    }

    // Debug: Log critical fields for Sarvam integration
    console.log(`[API_TOKEN] ===== METADATA DEBUG =====`);
    console.log(`[API_TOKEN] course_id: ${metadata.course_id || 'MISSING!'}`);
    console.log(`[API_TOKEN] conversation_id: ${metadata.conversation_id || 'MISSING!'}`);
    console.log(`[API_TOKEN] user_id: ${metadata.user_id || 'MISSING!'}`);
    console.log(`[API_TOKEN] module_id: ${metadata.module_id || 'MISSING!'}`);
    console.log(`[API_TOKEN] lesson_id: ${metadata.lesson_id || 'MISSING!'}`);
    console.log(`[API_TOKEN] session_type: ${metadata.session_type || 'MISSING!'}`);
    console.log(`[API_TOKEN] ============================`);

    console.log(
      `[API_TOKEN] Room metadata prepared for room '${body.room_name}':`,
      metadata
    );

    // Create room with metadata FIRST (so agent can read ctx.room.metadata)
    // Note: Agent auto-dispatches to all rooms (no explicit agent dispatch needed)
    try {
      const room = await roomService.createRoom({
        name: body.room_name,
        metadata: JSON.stringify(metadata),
        emptyTimeout: 600, // 10 minutes
      });

      console.log(
        `[API_TOKEN] Created room '${room.name}' with SID: ${room.sid}`
      );
    } catch (roomError) {
      // Room might already exist - update its metadata instead
      console.warn(
        `[API_TOKEN] Room creation failed (may already exist):`,
        roomError
      );
      console.log(
        `[API_TOKEN] Attempting to update metadata for existing room '${body.room_name}'`
      );

      try {
        const room = await roomService.updateRoomMetadata(
          body.room_name,
          JSON.stringify(metadata)
        );
        console.log(
          `[API_TOKEN] Updated metadata for existing room '${room.name}'`
        );
      } catch (updateError) {
        console.error(
          `[API_TOKEN] Failed to update room metadata:`,
          updateError
        );
        // Continue anyway - room might be newly created by someone else
      }
    }

    // Get credentials for token creation
    const { apiKey, apiSecret, url } = getLiveKitCredentials();

    // Create access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: body.participant_name,
      name: body.participant_name,
      metadata: JSON.stringify(metadata),
    });

    // Grant room permissions
    at.addGrant({
      roomJoin: true,
      room: body.room_name,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomRecord: false, // Disable recording permission
    } as VideoGrant);

    // Generate JWT token
    const jwt = await at.toJwt();

    console.log(
      `[API_TOKEN] Successfully generated token for '${body.participant_name}'`
    );

    const response: TokenResponse = {
      token: jwt,
      url: url,
      room_name: body.room_name,
      participant_name: body.participant_name,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[API_TOKEN] Error generating token:", error);
    return NextResponse.json(
      {
        error: `Failed to generate token: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
