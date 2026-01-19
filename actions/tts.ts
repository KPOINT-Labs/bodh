"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { ElevenLabsClient } from "elevenlabs";
import { createHash } from "crypto";
import { DEFAULT_TTS_CONFIG, ELEVENLABS_CONFIG, OPENAI_CONFIG, TTSResult } from "@/lib/tts";

const ttsSchema = z.object({
  text: z.string().min(1).max(5000),
  voice: z.string().default(DEFAULT_TTS_CONFIG.voice),
  speed: z.number().min(0.5).max(2.0).default(DEFAULT_TTS_CONFIG.speed),
  model: z.string().default(DEFAULT_TTS_CONFIG.model),
});

export async function generateTTS(
  text: string,
  options?: {
    voice?: string;
    speed?: number;
    model?: string;
  }
): Promise<TTSResult> {
  try {
    console.log("[TTS] prisma object:", typeof prisma, prisma ? "defined" : "undefined");

    // Validate input
    const validated = ttsSchema.parse({
      text,
      voice: options?.voice,
      speed: options?.speed,
      model: options?.model,
    });

    const { text: validatedText, voice, speed, model } = validated;

    // Generate cache hash
    const textHash = createHash("sha256")
      .update(`${validatedText}:${voice}:${speed}:${model}`)
      .digest("hex");

    console.log("[TTS] About to query cache, prisma.tTSCache:", typeof prisma?.tTSCache);

    // Check cache first
    const cached = await prisma.tTSCache.findUnique({
      where: { textHash },
    });

    if (cached) {
      console.log("[TTS] Cache hit for textHash:", textHash.substring(0, 16));

      // Update lastUsedAt
      await prisma.tTSCache.update({
        where: { textHash },
        data: { lastUsedAt: new Date() },
      });

      return {
        success: true,
        audioData: cached.audioData,
      };
    }

    console.log("[TTS] Cache miss, generating audio with TTS provider");

    // Determine which provider to use
    const provider = process.env.TTS_PROVIDER || 'elevenlabs';
    console.log("[TTS] Using provider:", provider);

    let buffer: Buffer;

    if (provider === 'elevenlabs') {
      if (!process.env.ELEVENLABS_API_KEY) {
        throw new Error('ELEVENLABS_API_KEY not configured');
      }

      console.log("[TTS] Calling ElevenLabs API");

      // Initialize ElevenLabs client
      const elevenlabs = new ElevenLabsClient({
        apiKey: process.env.ELEVENLABS_API_KEY,
      });

      // Use ElevenLabs configuration
      const elevenLabsVoice = voice || ELEVENLABS_CONFIG.voice;
      const elevenLabsModel = model || ELEVENLABS_CONFIG.model;
      const elevenLabsSpeed = speed || ELEVENLABS_CONFIG.voiceSettings.speed;

      // Generate speech with ElevenLabs
      const audio = await elevenlabs.textToSpeech.convert(elevenLabsVoice, {
        text: validatedText,
        model_id: elevenLabsModel,
        output_format: ELEVENLABS_CONFIG.outputFormat,
        voice_settings: {
          stability: ELEVENLABS_CONFIG.voiceSettings.stability,
          similarity_boost: ELEVENLABS_CONFIG.voiceSettings.similarityBoost,
          speed: elevenLabsSpeed,
          use_speaker_boost: ELEVENLABS_CONFIG.voiceSettings.useSpeakerBoost,
        }
      });

      // Convert Readable stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of audio) {
        chunks.push(Buffer.from(chunk));
      }
      buffer = Buffer.concat(chunks);
      console.log("[TTS] ElevenLabs audio generated");

    } else if (provider === 'openai') {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not configured');
      }

      console.log("[TTS] Calling OpenAI API");

      // Initialize OpenAI client
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Use OpenAI configuration
      const openAIVoice = voice || OPENAI_CONFIG.voice;
      const openAIModel = model || OPENAI_CONFIG.model;
      const openAISpeed = speed || OPENAI_CONFIG.speed;

      // Call OpenAI TTS API
      const response = await openai.audio.speech.create({
        model: openAIModel,
        voice: openAIVoice as any,
        speed: openAISpeed,
        input: validatedText,
        response_format: "mp3",
      });

      // Convert to buffer
      buffer = Buffer.from(await response.arrayBuffer());
      console.log("[TTS] OpenAI audio generated");

    } else {
      throw new Error(`Unknown TTS_PROVIDER: ${provider}`);
    }

    // Convert to base64
    const audioData = buffer.toString("base64");
    console.log("[TTS] Generated audio, size:", audioData.length, "bytes (base64)");

    // Save to cache
    await prisma.tTSCache.create({
      data: {
        textHash,
        text: validatedText,
        audioData,
        voice,
        speed,
        model,
        lastUsedAt: new Date(),
      },
    });

    console.log("[TTS] Saved to cache");

    return {
      success: true,
      audioData,
    };
  } catch (error: any) {
    const provider = process.env.TTS_PROVIDER || 'elevenlabs';
    console.error(`[TTS] ${provider} error:`, error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid input parameters",
      };
    }

    if (error?.message?.includes('quota_exceeded')) {
      return {
        success: false,
        error: "TTS quota exceeded. Please check API key limits.",
      };
    }

    if (error?.message?.includes('invalid_api_key') || error?.message?.includes('not configured')) {
      return {
        success: false,
        error: `Invalid API key. Please check ${provider.toUpperCase()}_API_KEY configuration.`,
      };
    }

    if (error?.code === "ECONNREFUSED" || error?.code === "ENOTFOUND") {
      return {
        success: false,
        error: "Network error - please check your connection",
      };
    }

    return {
      success: false,
      error: error?.message || "Failed to generate audio",
    };
  }
}
