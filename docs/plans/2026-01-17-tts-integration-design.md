# TTS Integration Design

**Date**: 2026-01-17
**Status**: Approved
**Purpose**: Implement reusable Text-to-Speech system with OpenAI TTS API, database caching, and global audio controls

---

## Overview

Implement a Text-to-Speech (TTS) system that auto-plays the welcome message on `/courses` page and provides a global audio toggle button. The system uses OpenAI's TTS API with database caching for performance and cost optimization.

## Architecture

### Core Components

**1. AudioContext Provider** (`/contexts/AudioContext.tsx`)
- Manages global audio state across the application
- State: `isMuted` (boolean), `isPlaying` (boolean)
- Persists `isMuted` in localStorage
- Provides `toggleMute()` and `setIsPlaying()` functions

**2. useTTS Hook** (`/hooks/useTTS.ts`)
- Custom React hook for TTS playback
- Consumes AudioContext to check mute state
- Returns: `{ speak, stop, isLoading, isPlaying, error }`
- Manages HTMLAudioElement lifecycle
- Auto-stops when global mute is toggled

**3. TTS Server Action** (`/actions/tts.ts`)
- Cache-first strategy with PostgreSQL
- SHA-256 hash for cache keys: `${text}:${voice}:${speed}:${model}`
- Returns `{ success: boolean, audioData?: string, error?: string }`
- OpenAI API integration with error handling

**4. AudioToggleButton Component** (`/components/audio/AudioToggleButton.tsx`)
- Global mute/unmute control
- Designer-approved styling matching existing patterns
- Blue (bg-blue-500) when unmuted, gray (bg-gray-300) when muted
- Volume2/VolumeX icons from Lucide

### Data Flow

```
User lands on /courses
→ WelcomeContent mounts
→ useEffect calls speak("नमस्ते! I'm...")
→ useTTS checks AudioContext.isMuted
→ If unmuted: generateTTS server action
→ Server checks cache (textHash lookup)
→ Cache hit: Return base64 audio (instant, $0)
→ Cache miss: OpenAI API → encode → save → return
→ useTTS creates Audio element with data URL
→ Play audio + update global isPlaying state
→ AudioToggleButton reflects current state
```

## Database Schema

**Model**: `TTSCache`

```prisma
model TTSCache {
  id         String   @id @default(cuid())
  textHash   String   @unique
  text       String   @db.Text
  audioData  String   @db.Text
  voice      String
  speed      Float
  model      String
  createdAt  DateTime @default(now())
  lastUsedAt DateTime @default(now()) @updatedAt

  @@index([textHash])
  @@index([lastUsedAt])
}
```

**Fields:**
- `textHash`: SHA-256 hash for cache lookup (unique)
- `text`: Original text (for debugging/admin)
- `audioData`: Base64-encoded MP3 audio
- `voice`: OpenAI voice ID (default: "marin")
- `speed`: Playback speed (default: 1.2)
- `model`: OpenAI model (default: "gpt-4o-mini-tts")
- `lastUsedAt`: Auto-updated on cache hits (for cleanup strategy)

## TTS Configuration

**Defaults** (matching BODH agent):
- **Model**: `gpt-4o-mini-tts`
- **Voice**: `marin`
- **Speed**: `1.2` (20% faster)
- **Format**: `mp3`

## Implementation Details

### 1. Server Action (`/actions/tts.ts`)

**Input Validation**:
```typescript
const schema = z.object({
  text: z.string().min(1).max(5000),
  voice: z.string().default("marin"),
  speed: z.number().min(0.5).max(2.0).default(1.2),
  model: z.string().default("gpt-4o-mini-tts")
});
```

**Cache Strategy**:
1. Generate hash: `crypto.createHash('sha256').update('${text}:${voice}:${speed}:${model}').digest('hex')`
2. Lookup by `textHash` in database
3. On hit: Update `lastUsedAt`, return cached audio
4. On miss: Call OpenAI, save to DB, return audio

**Error Handling**:
- Network errors: Return `{ success: false, error: "Network error" }`
- API errors: Return `{ success: false, error: "TTS generation failed" }`
- No thrown errors - always return ActionResult

### 2. useTTS Hook (`/hooks/useTTS.ts`)

**State Management**:
```typescript
const [isLoading, setIsLoading] = useState(false);
const [isPlaying, setIsPlaying] = useState(false);
const [error, setError] = useState<string | null>(null);
const audioRef = useRef<HTMLAudioElement | null>(null);
```

**speak() Function**:
- Check `isMuted` → early return if true
- Stop any currently playing audio
- Call `generateTTS` server action
- Create HTMLAudioElement with base64 data URL
- Attach event listeners (onplay, onended, onerror)
- Play audio
- Update global `isPlaying` state

**Auto-stop on Mute**:
```typescript
useEffect(() => {
  if (isMuted && isPlaying) {
    stop();
  }
}, [isMuted]);
```

### 3. AudioToggleButton (`/components/audio/AudioToggleButton.tsx`)

**Designer Pattern** (exact match):
```tsx
<button
  onClick={toggleMute}
  className={`p-2 rounded-lg transition-all hover:scale-110 ${
    isMuted
      ? 'bg-gray-300 text-gray-600 hover:bg-gray-400'
      : 'bg-blue-500 text-white hover:bg-blue-600'
  }`}
  title={isMuted ? 'Unmute voice' : 'Mute voice'}
>
  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
</button>
```

**States**:
- Muted: VolumeX icon, gray background
- Unmuted (idle or playing): Volume2 icon, blue background

### 4. WelcomeContent Integration

**Header Modification** (line ~33-40):
```tsx
<div className="flex items-center justify-between">
  <div className="flex items-center gap-3">
    {/* Existing: Avatar + title */}
  </div>
  <div className="flex items-center gap-2">
    <AudioToggleButton />
  </div>
</div>
```

**Auto-play Logic**:
```tsx
const { speak } = useTTS();

useEffect(() => {
  speak("नमस्ते! I'm your personal AI learning companion. I'm here whenever you need help—clarifying a concept, checking your understanding, or even just exploring new ideas. Let's learn together.");
}, []); // Runs every time component mounts
```

**No Session Restriction**: Audio plays every time user navigates to `/courses`

## Technical Considerations

### Browser Autoplay Policy
- Modern browsers may block autoplay without user interaction
- If blocked: `audio.play()` Promise rejects
- Caught in try/catch → silent failure (acceptable)
- User can manually click AudioToggleButton to trigger playback

### Audio Format
- MP3 format for best browser compatibility
- Base64 encoding for simple data URL playback
- Typical size: 10-200KB per clip (works well with base64)

### Caching Benefits
- Welcome message cached after first generation
- Instant playback on subsequent visits (0ms, $0)
- Reduced OpenAI API costs
- Works even if OpenAI API temporarily down

### Future Cache Cleanup
- `lastUsedAt` index enables cleanup queries
- Example: `DELETE FROM TTSCache WHERE lastUsedAt < NOW() - INTERVAL '6 months'`
- Can be implemented as cron job or admin tool

## File Structure

### New Files
1. `/contexts/AudioContext.tsx` - Global audio state provider
2. `/hooks/useTTS.ts` - TTS playback hook
3. `/actions/tts.ts` - TTS generation server action
4. `/components/audio/AudioToggleButton.tsx` - Mute/unmute button
5. `/lib/tts.ts` - Type definitions and constants (optional)

### Modified Files
1. `/prisma/schema.prisma` - Add TTSCache model
2. `/app/(learning)/courses/WelcomeContent.tsx` - Add TTS integration
3. `/app/layout.tsx` - Wrap with AudioContextProvider
4. `.env` - Add OPENAI_API_KEY

### Dependencies
- `openai` package (install via `bun add openai`)

## Environment Variables

**Required**:
```env
OPENAI_API_KEY=sk-...
```

## Reusability

This architecture enables TTS in other locations:

**Example: Chat Messages**
```tsx
const { speak } = useTTS();

const handleMessageReceive = (message) => {
  if (message.role === 'assistant') {
    speak(message.content);
  }
};
```

**Example: Lesson Content**
```tsx
<AudioToggleButton />
{/* Button already controls global state */}
```

**Example: Notifications**
```tsx
const { speak } = useTTS();

useEffect(() => {
  if (notification.important) {
    speak(notification.message);
  }
}, [notification]);
```

## Verification Steps

1. Install dependencies: `bun add openai`
2. Add `OPENAI_API_KEY` to `.env`
3. Update schema: `./node_modules/.bin/prisma db push`
4. Navigate to `/courses` (first visit)
   - Check network: OpenAI API call
   - Verify audio plays (marin voice, 1.2x speed)
   - Check database: TTSCache entry exists
5. Reload page
   - No API call (cache hit)
   - Audio plays instantly
6. Test mute button
   - Click → audio stops
   - Navigate away and back → no audio (muted)
   - Click again → audio plays
7. Test localStorage persistence
   - Mute audio
   - Refresh page
   - Verify still muted (state persisted)
8. Browser compatibility
   - Test Chrome, Firefox, Safari
   - Verify autoplay handling
   - Check mobile browsers

## Future Enhancements

1. **Cache Management UI**: Admin interface to view/clear cached entries
2. **Multiple Voices**: Allow users to select preferred voice
3. **Playback Speed Control**: UI for adjusting speed (0.5x-2x)
4. **Audio Visualization**: Waveform or level meters
5. **Queue Management**: Support queueing multiple TTS requests
6. **Offline Support**: Cache common phrases for offline use
7. **Accessibility**: Full keyboard navigation and screen reader support
8. **Analytics**: Track TTS usage patterns

## Notes

- OpenAI SDK's `playAudio()` helper requires Node.js (won't work in browser)
- We use custom browser-based playback with HTMLAudioElement
- Base64 data URLs work well for TTS audio (typically small files)
- Global audio state enables future features (music player, sound effects, etc.)
- Design matches existing project patterns (from Aivideolearningjan26v3)
