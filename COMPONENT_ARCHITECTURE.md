# Bodh Component Architecture - Phase 1 Basic Layout

## Overview
This document outlines the component structure for Phase 1 implementation of the Bodh learning interface. We'll focus on creating the basic layout structure that can be easily adapted as the design evolves.

## Phase 1: Basic Layout Components

### Core Layout Structure

```
app/
├── layout.tsx                    # Root layout with providers
├── page.tsx                      # Landing/redirect page
└── (learning)/
    ├── layout.tsx               # SidebarProvider and main layout
    └── course/
        └── [courseId]/
            └── lesson/
                └── [lessonId]/
                    └── page.tsx  # Main learning interface page

components/
├── navigation/
│   └── course-sidebar.tsx       # shadcn Sidebar with course navigation
├── layout/
│   ├── ContentArea.tsx          # Main lesson content container
│   └── RightPanel.tsx           # Comments/peer learning panel
├── course/
│   ├── CourseHeader.tsx         # Course title and objective
│   └── CourseContent.tsx        # Scrollable lesson content
├── video/
│   ├── VideoPlayer.tsx          # KPoint video placeholder
│   └── VideoControls.tsx        # Video control components
└── chat/
    └── ChatInput.tsx            # AI chat input interface
```

## Component Specifications

### 1. Learning Layout Component
```typescript
// app/(learning)/layout.tsx
interface LearningLayoutProps {
  children: React.ReactNode;
}

// Features:
- SidebarProvider wrapper for shadcn sidebar
- CourseSidebar with collapsible behavior
- SidebarInset for main content area
- Built-in mobile responsiveness
```

### 2. CourseSidebar Component (shadcn)
```typescript
// components/navigation/course-sidebar.tsx
interface CourseSidebarProps {
  // Uses shadcn sidebar components internally
  // No props needed - uses internal mock data
}

// Features:
- SidebarHeader with "New Course" button
- SidebarContent with course list and progress
- SidebarFooter with user profile
- Keyboard shortcut support (Cmd/Ctrl + B)
- Mobile sheet/drawer behavior
- State persistence via cookies
```

### 3. Module Page with Resizable Panels
```typescript
// app/(learning)/course/[courseId]/module/[moduleId]/page.tsx
interface ModulePageProps {
  params: { courseId: string; moduleId: string };
}

// Features:
- ResizablePanelGroup for main content and video panel
- Left: Course content with AI chat assistant
- Right: Video player panel (when lesson selected)
- Resizable handle between panels
- Mobile-responsive (right panel hidden on small screens)
```

### 4. VideoPlayer Component (KPoint Placeholder)
```typescript
interface VideoPlayerProps {
  videoId: string;           // KPoint video ID
  courseId?: string;         // KPoint course ID
  thumbnail?: string;        // Preview thumbnail
  height?: string | number;  // Player height
  width?: string | number;   // Player width
}

// Features:
- Placeholder div for KPoint embed
- Shows thumbnail or placeholder image
- Responsive container sizing
- "Video will load here" message
- Ready for KPoint SDK integration
```

### 5. ChatInput Component
```typescript
interface ChatInputProps {
  placeholder?: string;
  onSubmit: (message: string) => void;
  onVoiceClick?: () => void;
}

// Features:
- Text input field
- Voice input button
- Submit on Enter
- Loading/disabled states
```

## Styling Guidelines

### Design Tokens
```css
/* Colors - Using CSS variables for easy theming */
--primary: #8b5cf6;        /* Purple for AI elements */
--secondary: #f97316;      /* Orange for actions */
--background: #ffffff;     /* White background */
--surface: #f9fafb;        /* Light gray surfaces */
--text-primary: #111827;   /* Dark text */
--text-secondary: #6b7280; /* Gray text */

/* Spacing */
--spacing-xs: 0.25rem;     /* 4px */
--spacing-sm: 0.5rem;      /* 8px */
--spacing-md: 1rem;        /* 16px */
--spacing-lg: 1.5rem;      /* 24px */
--spacing-xl: 2rem;        /* 32px */

/* Border Radius */
--radius-sm: 0.25rem;      /* 4px */
--radius-md: 0.5rem;       /* 8px */
--radius-lg: 1rem;         /* 16px */
--radius-full: 9999px;     /* Full round */
```

### Responsive Breakpoints
```css
/* Mobile First Approach */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large screens */
```

## Implementation Order

### Step 1: Basic Layout Shell
1. Create `MainLayout` with three-column structure
2. Implement responsive behavior with Tailwind
3. Add basic styling and shadows

### Step 2: Navigation Sidebar
1. Create `LeftSidebar` component
2. Add `CourseList` with mock data
3. Implement `CourseItem` with progress indicator
4. Add active state and hover effects

### Step 3: Content Area
1. Create `ContentArea` wrapper
2. Add `CourseHeader` with title display
3. Implement scrollable content container
4. Add placeholder for dynamic content

### Step 4: Video Player (KPoint Placeholder)
1. Create placeholder `VideoPlayer` component
2. Add placeholder div with aspect ratio
3. Display "Video will load here" message
4. Add responsive sizing container
5. Prepare props for KPoint integration

### Step 5: Chat Interface
1. Create `ChatInput` component
2. Add text input with styling
3. Add voice button (non-functional)
4. Style with purple accent

## State Management (Basic)

### Local State Structure
```typescript
// Course Context
interface CourseState {
  activeCourseId: string | null;
  activeLesson: Lesson | null;
  isLoading: boolean;
}

// Video Context (KPoint)
interface VideoState {
  videoId: string | null;
  isReady: boolean;
  // KPoint player state will be managed by their SDK
}

// Chat Context
interface ChatState {
  messages: Message[];
  isTyping: boolean;
}
```

## Mock Data Structure

```typescript
// For Phase 1 Development
const mockCourse = {
  id: "computational-thinking",
  title: "Computational Thinking",
  progress: 15,
  lessons: [
    {
      id: "lesson-1",
      title: "Introduction to Patterns",
      duration: "10 min",
      videoId: "kpoint-video-123",  // KPoint video ID
      courseId: "kpoint-course-456" // KPoint course ID
    }
  ]
};

const mockLearningObjective =
  "Learning Objective: Understand how to break down problems into patterns";
```

## Component Props Summary

| Component | Required Props | Optional Props |
|-----------|---------------|----------------|
| MainLayout | children | sidebar, rightPanel |
| LeftSidebar | courses, onCourseSelect | activeCourseId |
| ContentArea | lesson, children | - |
| VideoPlayer | videoId | courseId, thumbnail, height, width |
| ChatInput | onSubmit | placeholder, onVoiceClick |

## File Naming Conventions

- **Components**: PascalCase (e.g., `VideoPlayer.tsx`)
- **Utilities**: camelCase (e.g., `formatTime.ts`)
- **Types**: PascalCase with `.types.ts` (e.g., `Course.types.ts`)
- **Styles**: kebab-case (e.g., `video-player.module.css`)

## Next Steps After Phase 1

Once the basic layout is complete and stable:
1. Add interactive content sections (recap, warmup, etc.)
2. Integrate real video functionality
3. Connect AI chat capabilities
4. Implement assessment components
5. Add animations and transitions
6. Integrate with backend APIs

## Testing Checklist for Phase 1

- [ ] Layout responsive on mobile/tablet/desktop
- [ ] Sidebar collapses properly on mobile
- [ ] Video player placeholder displays correctly
- [ ] KPoint video container maintains aspect ratio
- [ ] Chat input accepts text
- [ ] Course navigation highlights active course
- [ ] Content area scrolls independently
- [ ] All components render without errors
- [ ] Basic accessibility (keyboard navigation)

## Notes

- Keep components simple and focused for Phase 1
- Use mock data initially, prepare for API integration
- Focus on layout structure over complex functionality
- Ensure responsive design from the start
- Use Tailwind classes consistently
- Prepare for easy theming/styling updates
- KPoint video player will be integrated later with their SDK/embed code
- Placeholder video component should maintain 16:9 aspect ratio