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
 * ElevenLabs TTS Configuration
 */
export const ELEVENLABS_CONFIG = {
  voice: "2zRM7PkgwBPiau2jvVXc", // Monica (Female, Expressive)
  model: "eleven_multilingual_v2",
  voiceSettings: {
    stability: 0.5,
    similarityBoost: 0.75,
    speed: 1.0, // Normal speed
    useSpeakerBoost: true,
  },
  outputFormat: "mp3_44100_128" as const,
};

/**
 * OpenAI TTS Configuration (Fallback)
 */
export const OPENAI_CONFIG = {
  voice: "marin",
  speed: 1.2,
  model: "gpt-4o-mini-tts",
};

/**
 * Default TTS configuration (uses provider from env)
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
