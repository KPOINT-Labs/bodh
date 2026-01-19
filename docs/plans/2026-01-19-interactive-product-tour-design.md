# Interactive Product Tour with Mock Data - Design Document

**Date:** 2026-01-19
**Status:** Design Complete - Ready for Implementation

## Overview

Replace the current static OnboardingModal (6 slides) with an interactive product tour using driver.js that highlights actual UI elements with mock data. The tour provides a hands-free, TTS-guided experience showing users where key features are located.

## Problem Statement

The existing OnboardingModal tour:
- Shows generic slides without highlighting actual UI elements
- Doesn't help users understand where features are located
- Not helpful or engaging for users
- Static content disconnected from real interface

## Solution

Create an interactive tour that:
- Uses driver.js to highlight real UI elements with spotlights
- Runs in a mock/demo mode with fake data overlay
- Auto-plays TTS descriptions for each step
- Can be triggered on-demand from courses page
- Shows fake chat messages, lessons, and video to demonstrate interface

---

## Architecture & Entry Flow

### Tour Entry Point

Add a "Take a Tour" button to the courses page header (WelcomeContent.tsx), positioned near the existing audio toggle.

**When clicked:**
1. Redirect to: `/course/demo/module/demo?tour=true&redirect_back_to=/courses`
2. Special route params `demo/demo` signal mock mode
3. Query params control behavior:
   - `tour=true` triggers driver.js tour
   - `redirect_back_to` stores return URL

### Mock Data Detection

The ModulePage component detects tour mode with double validation:

```typescript
const searchParams = await searchParams;
const tourParam = searchParams.get('tour');
const isTourMode = courseId === 'demo' && moduleId === 'demo' && tourParam === 'true';
```

**Security:** Requires both route params AND query parameter to prevent accidental mock mode activation if a real course has ID "demo".

When true:
- Skip database queries entirely
- Pass mock data directly to ModuleContent component
- Render in tour mode with fake content

### Mock Data Structure

Create `lib/mockTourData.ts` containing:

```typescript
export const mockTourData = {
  course: {
    id: 'demo',
    title: 'Product Tour Demo',
    description: 'Learn how to use the platform',
    learningObjectives: []
  },

  module: {
    id: 'demo',
    title: 'Getting Started',
    courseId: 'demo',
    lessons: [
      {
        id: 'lesson-1',
        title: 'Introduction',
        orderIndex: 0,
        kpointVideoId: null,
        youtubeVideoId: null,
        description: 'Welcome to the platform',
        duration: 330 // 5:30
      },
      {
        id: 'lesson-2',
        title: 'Key Concepts',
        orderIndex: 1,
        description: 'Understanding the basics',
        duration: 420 // 7:00
      },
      {
        id: 'lesson-3',
        title: 'Deep Dive',
        orderIndex: 2,
        description: 'Advanced features',
        duration: 540 // 9:00
      },
      {
        id: 'lesson-4',
        title: 'Practice Questions',
        orderIndex: 3,
        description: 'Test your knowledge',
        duration: 300 // 5:00
      }
    ]
  },

  chatMessages: [
    {
      id: '1',
      type: 'ai',
      content: "Hello! I'm your AI learning companion. I'll help you understand this lesson on Introduction to Photosynthesis.",
      enableAnimation: false
    },
    {
      id: '2',
      type: 'ai',
      content: "As you watch the video, I'll pause to ask questions and make sure you're following along. Feel free to ask me anything!",
      enableAnimation: false
    }
  ]
};
```

---

## Driver.js Integration

### Installation

```bash
bun add driver.js
```

### Tour Hook: `hooks/useTour.ts`

Create a custom hook that:
- **Client-only execution:** Only runs in browser (not during SSR)
- Uses dynamic import for driver.js to avoid server-side errors
- Initializes driver.js with app theme configuration
- Defines the 6 tour steps with element selectors
- Integrates with useTTS hook to speak each step
- Handles tour completion and redirect

```typescript
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTTS } from './useTTS';
import type { Driver } from 'driver.js';

export function useTour() {
  const [driver, setDriver] = useState<Driver | null>(null);
  const router = useRouter();
  const { speak } = useTTS();

  useEffect(() => {
    // Client-only: Only initialize driver.js in browser
    if (typeof window === 'undefined') return;

    // Dynamic import to avoid SSR issues
    import('driver.js').then((mod) => {
      const driverInstance = mod.driver({
        // ... configuration
      });
      setDriver(driverInstance);
    });

    return () => {
      driver?.destroy();
    };
  }, []);

  return { driver, startTour: () => driver?.drive() };
}
```

### Tour Configuration

```typescript
const driverConfig = {
  showProgress: true, // Show "1 of 6" progress
  showButtons: ['next', 'previous', 'close'],
  nextBtnText: 'Next →',
  prevBtnText: '← Back',
  doneBtnText: 'Finish Tour',

  popoverClass: 'tour-popover',
  animate: true,
  allowClose: true,
  overlayOpacity: 0.75,

  // Skip missing elements instead of failing
  onPopoverRender: (popover, { config, state }) => {
    const element = document.querySelector(state.activeElement?.selector || '');
    if (!element) {
      console.warn(`Tour step skipped: element not found - ${state.activeElement?.selector}`);
      return false; // Skip this step
    }
  },

  onDestroyed: () => {
    handleTourComplete();
  },

  onHighlightStarted: (element, step, options) => {
    // Guard: Only speak if description exists
    const description = step?.popover?.description;
    if (description && typeof description === 'string') {
      speak(description, { interrupt: true });
    }
  }
};
```

**Element Validation:** Before starting the tour, verify all required elements exist:

```typescript
function validateTourElements(): boolean {
  const requiredSelectors = [
    '.tour-chat-area',
    '.tour-text-input',
    '.tour-mic-button',
    '.tour-video-panel',
    '.tour-lesson-sidebar',
    '.tour-audio-toggle'
  ];

  const missingElements = requiredSelectors.filter(
    selector => !document.querySelector(selector)
  );

  if (missingElements.length > 0) {
    console.error('Tour cannot start: missing elements', missingElements);
    return false;
  }

  return true;
}

// Call before starting tour
if (validateTourElements()) {
  driver.drive();
} else {
  // Fallback: redirect back or show error
  router.push('/courses');
}
```

---

## Tour Step Sequence

**Interactive Approach** - Following conversational learning flow:

### Step 1: Chat Area
- **Target:** `.tour-chat-area`
- **Highlight:** Scrollable message container
- **Title:** "AI Companion Messages"
- **Description:** "Your AI companion sends messages here, guiding you through lessons and asking questions to check your understanding"
- **TTS:** Auto-plays description

### Step 2: Text Input
- **Target:** `.tour-text-input`
- **Highlight:** Input field at bottom
- **Title:** "Type Your Responses"
- **Description:** "Type your responses, ask questions, or chat with your AI companion anytime during the lesson"
- **TTS:** Auto-plays description

### Step 3: Unmute Mic Button
- **Target:** `.tour-mic-button`
- **Highlight:** Microphone icon in input area
- **Title:** "Voice Input"
- **Description:** "Prefer speaking? Click here to use voice input instead of typing"
- **TTS:** Auto-plays description

### Step 4: Video Panel
- **Target:** `.tour-video-panel`
- **Highlight:** Video player area (showing placeholder)
- **Title:** "Video Lectures"
- **Description:** "Watch your video lectures here. The AI can pause the video to check in with you"
- **TTS:** Auto-plays description

### Step 5: Left Sidebar
- **Target:** `.tour-lesson-sidebar`
- **Highlight:** Collapsible sidebar with lessons
- **Title:** "Lesson Navigation"
- **Description:** "Browse all lessons in this module and jump directly to any lesson you want to learn"
- **TTS:** Auto-plays description

### Step 6: Audio Toggle
- **Target:** `.tour-audio-toggle`
- **Highlight:** Audio button in header
- **Title:** "Audio Control"
- **Description:** "Control whether the AI speaks to you. Toggle this anytime to mute or unmute voice playback"
- **TTS:** Auto-plays description

---

## Mock UI Rendering

### ModuleContent Component Changes

Add `isTourMode` prop to ModuleContent:

```typescript
interface ModuleContentProps {
  course: Course;
  module: Module;
  userId: string;
  initialLessonId?: string;
  isTourMode?: boolean; // NEW
}
```

### When `isTourMode === true`:

**Chat Area:**
- Display mock chat messages from `mockTourData.chatMessages`
- No LiveKit integration
- No real-time messaging
- Static display only

**Video Panel:**
- Show placeholder image or solid background with "Demo Video" text
- Display mock video title: "Introduction to Photosynthesis"
- No actual video playback
- Just visual representation

**Sidebar:**
- Display mock lessons from `mockTourData.module.lessons`
- Show lesson titles, durations
- Mark first lesson as "current"
- No click handlers (disabled during tour)

**Input Area:**
- Show input field and mic button (disabled)
- Add visual indicators that it's a demo
- No actual functionality

**Add CSS Classes:**
Add tour-specific classes to each element for driver.js targeting:
- `tour-chat-area`
- `tour-text-input`
- `tour-mic-button`
- `tour-video-panel`
- `tour-lesson-sidebar`
- `tour-audio-toggle`

---

## Styling & Theme

### Custom CSS (add to `globals.css`)

```css
.tour-popover {
  background: linear-gradient(to-br, rgba(139, 92, 246, 0.95), rgba(217, 70, 239, 0.95));
  backdrop-filter: blur(12px);
  border: 2px solid rgb(196, 181, 253);
  border-radius: 1rem;
  color: white;
  box-shadow: 0 20px 25px -5px rgba(139, 92, 246, 0.3);
}

.tour-popover .driver-popover-title {
  font-weight: 600;
  font-size: 1.125rem;
}

.tour-popover .driver-popover-description {
  line-height: 1.6;
  margin-top: 0.5rem;
}

.tour-popover button {
  background: white;
  color: rgb(139, 92, 246);
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  font-weight: 500;
  transition: all 0.2s;
}

.tour-popover button:hover {
  background: rgb(243, 232, 255);
}
```

### Visual Consistency

- Matches existing violet/fuchsia gradient theme
- Uses same backdrop blur as other UI elements
- Consistent border radius (1rem)
- Smooth animations and transitions

---

## TTS Integration

### Auto-play Configuration

Use existing `useTTS()` hook:
- Voice: "marin" (matching BODH agent)
- Speed: 1.2 (20% faster)
- Model: gpt-4o-mini-tts
- Format: MP3

### Trigger Points

In `onHighlightStarted` callback:
```typescript
onHighlightStarted: (element, step) => {
  // Guard: Only speak if description exists
  const description = step?.popover?.description;
  if (description && typeof description === 'string') {
    speak(description, {
      voice: 'marin',
      speed: 1.2,
      interrupt: true // Cancel any previous playback
    });
  }
}
```

### Respects Global Audio Toggle

- If user has muted audio via AudioToggleButton, TTS is silenced
- User can toggle audio during tour
- No separate tour-specific audio controls needed

---

## Tour Completion & Redirect

### Completion Handler

```typescript
const handleTourComplete = () => {
  // 1. Get redirect URL from query params
  const urlParams = new URLSearchParams(window.location.search);
  const redirectUrl = urlParams.get('redirect_back_to') || '/courses';

  // 2. Security: Validate redirect URL to prevent open redirect attacks
  // Only allow same-origin relative paths starting with /
  const isValidRedirect = redirectUrl.startsWith('/') &&
                         !redirectUrl.startsWith('//') &&
                         !redirectUrl.includes('://');

  const safeRedirectUrl = isValidRedirect ? redirectUrl : '/courses';

  // 3. Add return_from_tour=true to skip animations on return
  const redirectWithParam = safeRedirectUrl.includes('?')
    ? `${safeRedirectUrl}&return_from_tour=true`
    : `${safeRedirectUrl}?return_from_tour=true`;

  // 4. Redirect back immediately
  router.push(redirectWithParam);
};
```

### Return Experience Enhancement

When redirecting back to courses page, add `return_from_tour=true` query parameter:
- **Purpose:** Skip typing animation on WelcomeContent
- **Example:** `/courses?return_from_tour=true`
- **Benefit:** Smoother, faster return experience after tour
- **Implementation:** WelcomeContent checks for this param and skips initial animation

```typescript
// In WelcomeContent.tsx
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const returnFromTour = urlParams.get('return_from_tour') === 'true';

  if (returnFromTour) {
    // Skip typing animation, show content immediately
    setShowButtons(true);

    // Clean URL while preserving other query params
    urlParams.delete('return_from_tour');
    const newSearch = urlParams.toString();
    const newUrl = newSearch ? `/courses?${newSearch}` : '/courses';
    window.history.replaceState({}, '', newUrl);
  } else {
    // Normal flow with animations
    startWelcomeSequence();
  }
}, []);
```

### No localStorage Tracking

- Tour is user-triggered only (not automatic)
- No need to track completion
- Users can retake tour anytime
- Button always shows "Take a Tour"

### Early Exit Handling

If user clicks close or presses ESC:
- Same redirect flow as completion
- Also adds `return_from_tour=true` for smooth return
- Clean exit without interrupting flow
- Returns to original page

### Error Handling

If tour mode fails or mock data doesn't load:
- Gracefully redirect to `/courses`
- Silent failure (console log only)
- User returns to courses page

---

## Implementation Checklist

### Phase 1: Setup & Mock Data
- [ ] Install driver.js: `bun add driver.js`
- [ ] Create `lib/mockTourData.ts` with fake course/module/lessons/chat
- [ ] Add tour CSS to `globals.css`

### Phase 2: Tour Logic
- [ ] Create `hooks/useTour.ts` with driver.js configuration
- [ ] Define 6 tour steps with selectors and descriptions
- [ ] Integrate TTS auto-play in `onHighlightStarted`
- [ ] Implement `handleTourComplete` redirect logic

### Phase 3: UI Integration
- [ ] Add "Take a Tour" button to WelcomeContent header
- [ ] Modify ModulePage to detect `demo/demo` route params
- [ ] Add `isTourMode` prop to ModuleContent component
- [ ] Render mock data when `isTourMode === true`
- [ ] Add tour CSS classes to all target elements
- [ ] Update redirect to include `return_from_tour=true` parameter
- [ ] Modify WelcomeContent to skip animation when returning from tour

### Phase 4: Testing
- [ ] Test tour flow from courses page
- [ ] Verify TTS auto-plays for each step
- [ ] Test audio toggle muting during tour
- [ ] Verify redirect after completion
- [ ] Test early exit (close button)
- [ ] Test on mobile/tablet responsiveness

### Phase 5: Polish
- [ ] Adjust popover positioning if needed
- [ ] Fine-tune TTS timing/speed
- [ ] Verify all mock data displays correctly
- [ ] Add loading states if needed
- [ ] Final UX review

---

## Benefits Over Current Approach

1. **Interactive vs Static:** Highlights actual UI elements instead of generic slides
2. **Contextual:** Shows users exactly where features are located
3. **Hands-free:** Auto-plays TTS so users can follow along without reading
4. **Realistic:** Mock data makes interface look active and engaging
5. **Non-intrusive:** User-triggered only, no forced onboarding
6. **Reusable:** Users can retake tour anytime they need help
7. **Smooth Return:** Skips animations when returning from tour for faster re-entry

---

## Security & Reliability Considerations

### Security Fixes

1. **Open Redirect Protection**
   - Validate `redirect_back_to` parameter
   - Only allow same-origin relative paths starting with `/`
   - Reject absolute URLs, protocol-relative URLs, or external domains
   - Fallback to `/courses` if validation fails

2. **Demo Mode Collision Prevention**
   - Require both route params (`demo/demo`) AND query param (`tour=true`)
   - Prevents accidental mock mode if real course has ID "demo"
   - Double validation ensures intentional tour activation only

### Reliability Fixes

3. **SSR/Client-Side Rendering Safety**
   - Dynamic import of driver.js to avoid SSR errors
   - Guard with `typeof window !== 'undefined'`
   - Only initialize tour in client-side useEffect
   - Component marked as `"use client"`

4. **Missing Element Handling**
   - Validate all required selectors before starting tour
   - Skip steps with missing elements gracefully
   - Log warnings for debugging but don't crash
   - Fallback redirect if critical elements missing

5. **TTS Robustness**
   - Guard against undefined descriptions
   - Type check before speaking
   - Use `interrupt: true` to cancel previous playback
   - Prevent audio overlap when navigating quickly

6. **Query Parameter Preservation**
   - Only remove `return_from_tour` parameter
   - Preserve all other existing query params
   - Clean URL without losing user state

---

## Technical Notes

- **Driver.js size:** ~5KB gzipped (lightweight)
- **No database changes:** Mock data only in code
- **No API calls:** All client-side tour logic
- **Respects existing patterns:** Uses existing TTS, routing, styling conventions
- **Backward compatible:** Doesn't affect existing onboarding flow
- **Client-only execution:** No SSR compatibility issues

---

## Future Enhancements (Optional)

- Add tour analytics (track completion rate)
- Create module-specific tours for advanced features
- Add "Help" menu with tour access from any page
- Translate tour text to multiple languages
- Create video walkthrough alternative
