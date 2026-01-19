# ElevenLabs TTS Migration Design

**Date:** 2026-01-19
**Status:** Approved
**Author:** Design Session

## Overview

Migrate the BODH project from OpenAI TTS to ElevenLabs TTS as the primary provider, while maintaining OpenAI as a fallback option. The migration uses the official ElevenLabs SDK and supports easy switching between providers via environment configuration.

## Goals

1. Replace OpenAI TTS with ElevenLabs as the primary TTS provider
2. Use ElevenLabs SDK for better maintainability and error handling
3. Keep OpenAI as fallback for easy reversion if needed
4. Maintain existing architecture and zero changes to client-side code
5. Use normal speed (1.0x) matching the Aivideolearningjan26v3 project

## Architecture

### Provider Abstraction

The system routes TTS requests to the appropriate provider based on the `TTS_PROVIDER` environment variable:

- **Primary:** ElevenLabs (Monica voice, 1.0x speed)
- **Fallback:** OpenAI (marin voice, 1.2x speed)

### Configuration-Based Switching

```env
TTS_PROVIDER=elevenlabs  # or 'openai' to switch back
ELEVENLABS_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
```

### Cache Strategy

The existing cache structure works without modifications:
- Hash: `text:voice:speed:model`
- Voice IDs are unique per provider, preventing collisions
- Switching providers generates new cache entries automatically
- No database migration needed

## Implementation Details

### 1. Package Installation

```bash
bun add elevenlabs
```

### 2. Configuration (`lib/tts.ts`)

Add ElevenLabs configuration:

```typescript
export const ELEVENLABS_CONFIG = {
  voice: "2zRM7PkgwBPiau2jvVXc", // Monica (Female, Expressive)
  model: "eleven_multilingual_v2",
  voiceSettings: {
    stability: 0.5,
    similarityBoost: 0.75,
    speed: 1.0, // Normal speed
    useSpeakerBoost: true,
  },
  outputFormat: "mp3_44100_128",
};

// Keep existing OpenAI config for fallback
export const OPENAI_CONFIG = {
  voice: "marin",
  speed: 1.2,
  model: "gpt-4o-mini-tts",
};
```

### 3. Provider Routing (`actions/tts.ts`)

Implement provider selection logic:

```typescript
import { ElevenLabsClient } from "elevenlabs";
import OpenAI from "openai";

const provider = process.env.TTS_PROVIDER || 'elevenlabs';

if (provider === 'elevenlabs') {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  // Initialize ElevenLabs client
  const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
  });

  // Generate speech
  const audio = await elevenlabs.textToSpeech.convert(voice, {
    text: validatedText,
    modelId: model,
    outputFormat: "mp3_44100_128",
    voiceSettings: {
      stability: 0.5,
      similarityBoost: 0.75,
      speed: speed,
    }
  });

  // Convert stream to buffer
  const buffer = Buffer.from(await audio.arrayBuffer());
  const audioData = buffer.toString("base64");

} else if (provider === 'openai') {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  // OpenAI generation (existing code)
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await openai.audio.speech.create({
    model: model,
    voice: voice as any,
    speed: speed,
    input: validatedText,
    response_format: "mp3",
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  const audioData = buffer.toString("base64");

} else {
  throw new Error(`Unknown TTS_PROVIDER: ${provider}`);
}
```

### 4. Error Handling

Implement provider-specific error messages:

```typescript
try {
  // Provider logic
} catch (error: any) {
  console.error(`[TTS] ${provider} error:`, error);

  if (error.message?.includes('quota_exceeded')) {
    return {
      success: false,
      error: "TTS quota exceeded. Please check API key limits.",
    };
  }

  if (error.message?.includes('invalid_api_key')) {
    return {
      success: false,
      error: "Invalid API key. Please check configuration.",
    };
  }

  return {
    success: false,
    error: error?.message || "Failed to generate audio",
  };
}
```

### 5. Environment Variables (`.env`)

Add new configuration:

```env
# TTS Configuration
TTS_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=your_elevenlabs_key_here

# Keep existing OpenAI key for fallback
OPENAI_API_KEY=your_openai_key_here
```

## Voice Configuration

### ElevenLabs Voice: Monica
- **ID:** `2zRM7PkgwBPiau2jvVXc`
- **Type:** Female, Expressive
- **Speed:** 1.0x (normal)
- **Model:** `eleven_multilingual_v2`
- **Settings:** Stability 0.5, Similarity Boost 0.75

### OpenAI Voice: Marin (Fallback)
- **ID:** `marin`
- **Speed:** 1.2x (20% faster)
- **Model:** `gpt-4o-mini-tts`

## Database Schema

**No changes needed.** The existing `TTSCache` table works perfectly:

```prisma
model TTSCache {
  id         String   @id @default(cuid())
  textHash   String   @unique
  text       String
  audioData  String   @db.Text
  voice      String   // Stores provider-specific voice IDs
  speed      Float
  model      String   // Stores provider-specific models
  lastUsedAt DateTime
  createdAt  DateTime @default(now())
}
```

The `voice` and `model` fields naturally separate providers in the cache hash.

## Benefits of Using ElevenLabs SDK

1. **Automatic Retries:** Built-in exponential backoff
2. **Type Safety:** Full TypeScript support
3. **Better Error Handling:** SDK handles common errors
4. **Maintained:** Official package by ElevenLabs team
5. **Cleaner Code:** Abstracted API complexity

## Files Modified

1. **`lib/tts.ts`** - Add ElevenLabs config and types
2. **`actions/tts.ts`** - Implement provider routing with SDK
3. **`.env`** - Add TTS_PROVIDER and ELEVENLABS_API_KEY
4. **`package.json`** - Add `elevenlabs` dependency

## Files Unchanged

- `hooks/useTTS.ts` - No changes needed
- `contexts/AudioContext.tsx` - No changes needed
- All UI components - No changes needed
- Database schema - No changes needed
- `prisma/schema.prisma` - No changes needed

## Testing Plan

### Manual Testing
1. Generate TTS with ElevenLabs and verify audio quality
2. Verify speed is 1.0x (normal)
3. Test cache hit/miss behavior
4. Switch to `TTS_PROVIDER=openai` and verify fallback
5. Test error scenarios (invalid API key, quota exceeded)

### Voice Comparison
1. Generate same text with both providers
2. Verify both are cached separately
3. Confirm voice quality meets expectations

### Integration Testing
1. Test in WelcomeContent component
2. Test in module learning flows
3. Verify mute/unmute functionality
4. Check AudioContext integration

## Provider Switching

To switch back to OpenAI:
1. Change `.env`: `TTS_PROVIDER=openai`
2. Restart dev server
3. No code changes needed

## References

- [ElevenLabs JS SDK](https://github.com/elevenlabs/elevenlabs-js)
- [Text-to-Speech API Documentation](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)
- [Voice Settings Documentation](https://elevenlabs.io/docs/api-reference/voices/settings/get)

## Next Steps

1. Install `elevenlabs` package
2. Update `lib/tts.ts` with configurations
3. Modify `actions/tts.ts` with provider routing
4. Add environment variables
5. Test with ElevenLabs
6. Test OpenAI fallback
7. Deploy to production
