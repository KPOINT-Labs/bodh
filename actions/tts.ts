"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { createHash } from "crypto";
import { DEFAULT_TTS_CONFIG, TTSResult } from "@/lib/tts";

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

    console.log("[TTS] Cache miss, calling OpenAI API");

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Call OpenAI TTS API
    const response = await openai.audio.speech.create({
      model: model,
      voice: voice as any,
      speed: speed,
      input: validatedText,
      response_format: "mp3",
    });

    // Convert to base64
    const buffer = Buffer.from(await response.arrayBuffer());
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
    console.error("[TTS] Error:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid input parameters",
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
