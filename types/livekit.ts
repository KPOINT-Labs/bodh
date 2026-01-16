/**
 * LiveKit API Types
 * Request/Response interfaces for LiveKit token and room management
 */

// Token endpoint types
export interface TokenRequest {
  room_name: string;
  participant_name: string;
  agent_type?: string; // default: "bodh-agent"
  domain?: string;
  video_ids?: string[];
  // Interview-specific metadata
  role?: string;
  interview_type?: string;
  resume_context?: string;
  // Bodh-specific metadata
  metadata?: Record<string, unknown>;
}

export interface TokenResponse {
  token: string;
  url: string;
  room_name: string;
  participant_name: string;
}

// Room endpoint types
export interface CreateRoomRequest {
  room_name?: string;
  agent_type?: string;
  domain?: string;
  video_ids?: string[];
  max_participants?: number;
  empty_timeout?: number;
}

export interface CreateRoomResponse {
  room_name: string;
  room_sid: string;
  status: string;
}

export interface RoomInfo {
  name: string;
  sid: string;
  num_participants: number;
  creation_time: number;
  metadata: Record<string, unknown>;
}

export interface ListRoomsResponse {
  rooms: RoomInfo[];
  total: number;
}

export interface DeleteRoomResponse {
  status: string;
  room_name: string;
}

// Room metadata structure (matches prism/adi2.py)
export interface RoomMetadata {
  agent_type: string;
  domain?: string;
  video_ids?: string[];
  role?: string;
  interview_type?: string;
  resume_context?: string;
  [key: string]: unknown;
}
