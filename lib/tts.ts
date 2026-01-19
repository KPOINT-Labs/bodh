/**
 * TTS Configuration Types and Constants
 */

export interface TTSOptions {
  voice?: string;
  speed?: number;
  model?: string;
  interrupt?: boolean; // Allow interrupting current playback
}

export interface TTSConfig {
  voice: string;
  speed: number;
  model: string;
}

export interface TTSResult {
  success: boolean;
  audioData?: string; // Base64-encoded MP3
  error?: string;
}

/**
 * Default TTS configuration matching BODH agent
 */
export const DEFAULT_TTS_CONFIG: TTSConfig = {
  voice: "marin",
  speed: 1.2,
  model: "gpt-4o-mini-tts",
};

/**
 * Available OpenAI TTS voices
 */
export const TTS_VOICES = [
  "alloy",
  "echo",
  "fable",
  "onyx",
  "nova",
  "shimmer",
  "marin", // Default for BODH agent
] as const;

export type TTSVoice = (typeof TTS_VOICES)[number];
