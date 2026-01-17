# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16.0.7 application using the App Router, React 19, TypeScript, and Bun as the package manager. The project integrates Prisma ORM with PostgreSQL and uses shadcn/ui for component library.

## Commands

### Development
```bash
bun run dev          # Start development server (runs on port 3000)
bun run build        # Build for production
bun run start        # Start production server
bun run lint         # Run ESLint
```

### Package Management
```bash
bun add <package>              # Add production dependency
bun add -d <package>           # Add dev dependency
bun install                    # Install all dependencies
```

### Database (Prisma)
```bash
./node_modules/.bin/prisma generate            # Generate Prisma Client
./node_modules/.bin/prisma db push             # Push schema changes to database (use this instead of migrate)
./node_modules/.bin/prisma studio              # Open Prisma Studio to view/edit data
./node_modules/.bin/prisma format              # Format schema file
```

**Important**: Use `prisma db push` instead of `prisma migrate dev` because the database user doesn't have permission to create shadow databases.

## Architecture

### Database Layer (Prisma 7)
- **Location**: `lib/prisma.ts`
- **Pattern**: Singleton pattern to prevent connection pool exhaustion during Next.js hot reloads
- **Adapter**: Uses `@prisma/adapter-pg` with PostgreSQL connection pooling
- **Configuration**: `prisma.config.ts` required for Prisma 7 CLI operations
- **Connection**: PostgreSQL database at `13.200.145.92:5432` (credentials in `.env`)

**Critical**: Always import Prisma from the singleton:
```typescript
import { prisma } from "@/lib/prisma";
```

### UI Components (shadcn/ui)
- **Configuration**: `components.json` defines style ("new-york"), icon library (lucide), and component aliases
- **Location**: UI components in `components/ui/`
- **Utilities**: `lib/utils.ts` contains the `cn()` helper for Tailwind class merging
- **Adding components**: Use shadcn CLI or manually create in `components/ui/`

### Styling
- **Framework**: Tailwind CSS v4 (using new @tailwindcss/postcss plugin)
- **Global styles**: `app/globals.css` with CSS variables for theming
- **Color system**: Uses OKLch color space for light/dark mode themes
- **Dark mode**: Custom variant configured with `@custom-variant dark`

### TypeScript Configuration
- **Path alias**: `@/*` maps to root directory (use `@/` for all imports)
- **Strict mode**: Enabled
- **Target**: ES2017
- **Module resolution**: Bundler

## Key Patterns

### Server Components & Prisma
Prisma can be used directly in async Server Components:
```typescript
export default async function Page() {
  const data = await prisma.yourModel.findMany();
  return <div>{/* render data */}</div>;
}
```

### Environment Variables
- **File**: `.env` in project root (gitignored)
- **Required**: `DATABASE_URL` for PostgreSQL connection
- **Access**: Automatically loaded by Next.js

### shadcn/ui Component Structure
- Components use Radix UI primitives with class-variance-authority for variants
- Import path: `@/components/ui/button` (uses configured alias)
- Styling: Tailwind classes with `cn()` utility for conditional classes

## Database Schema Workflow

1. Define or modify models in `prisma/schema.prisma`
2. Run `./node_modules/.bin/prisma db push` to sync schema with database
3. Prisma Client automatically regenerates (via postinstall hook)
4. Import and use: `import { prisma } from "@/lib/prisma"`

## Text-to-Speech (TTS) System

### Architecture
- **Global State**: `AudioContext` provider manages mute state and playback status
- **Hook**: `useTTS()` provides `speak()` function for playback
- **Server Action**: `generateTTS()` handles cache-first audio generation
- **Caching**: PostgreSQL `TTSCache` table stores base64-encoded MP3 audio

### Usage in Components

**Basic usage:**
```typescript
"use client";

import { useTTS } from "@/hooks/useTTS";

export function MyComponent() {
  const { speak, isLoading, isPlaying } = useTTS();

  const handleSpeak = () => {
    speak("Hello! This is a text-to-speech example.");
  };

  return <button onClick={handleSpeak}>Speak</button>;
}
```

**With custom voice/speed:**
```typescript
speak("Custom voice example", {
  voice: "nova",
  speed: 1.0,
});
```

### Global Audio Control

The `AudioToggleButton` component provides global mute/unmute control:
- Located in WelcomeContent header
- State persisted in localStorage
- When muted, ALL TTS playback is prevented

### Configuration

Default TTS settings (matching BODH agent):
- **Voice**: marin
- **Speed**: 1.2 (20% faster)
- **Model**: gpt-4o-mini-tts
- **Format**: MP3

See `lib/tts.ts` for type definitions and constants.

### Cache Management

TTS audio is cached in PostgreSQL:
- **Key**: SHA-256 hash of `text:voice:speed:model`
- **Storage**: Base64-encoded MP3 in `audioData` column
- **Tracking**: `lastUsedAt` updated on cache hits
- **Future**: Can implement cleanup of unused entries

### Environment Variables

Required:
- `OPENAI_API_KEY` - OpenAI API key for TTS generation

## Next.js DevTools MCP

**IMPORTANT**: Always call `mcp__next-devtools__init` first when starting work on this project to establish proper documentation context.

## LiveKit Documentation

LiveKit Agents is a fast-evolving project, and the documentation is updated frequently. You should always refer to the latest documentation when working with this project. For your convenience, LiveKit offers an MCP server that can be used to browse and search its documentation.

## Figma MCP Integration Rules

When working with Figma designs, always follow this workflow for consistently good output:

### Required Workflow
1. Run `get_design_context` first to understand the design
2. Use `get_metadata` if the response is large
3. Run `get_screenshot` for visual reference
4. Download necessary assets
5. Translate output to project conventions

### Implementation Guidelines
- **Figma Fidelity**: Prioritize exact match to Figma designs - treat MCP output as the design representation
- **Component Usage**: Use components from `@/components/ui` (shadcn/ui) when possible and create new components following existing patterns
- **Styling**: Replace generic Tailwind classes with project utilities and design system tokens
- **Class Merging**: Use `cn()` utility from `@/lib/utils` for conditional classes as per project conventions
- **Architecture**: Follow Next.js 16 App Router patterns and TypeScript strict mode requirements
- **Data Access**: Use Prisma client from `@/lib/prisma` singleton for any data operations
- **Theming**: Respect existing color system using OKLch and CSS custom properties for theming
- **Assets**: Use localhost sources directly for images/SVGs from Figma payload - do not import new icon packages
- **Accessibility**: Follow WCAG accessibility requirements and add proper ARIA labels
- **TypeScript**: Add TypeScript interfaces for component props following project patterns
- **Design Tokens**: Avoid hardcoded values - use design tokens and CSS variables where available
- **Documentation**: Create reusable, well-documented components that integrate with existing codebase architecture

## Important Notes

- **Package Manager**: This project uses Bun, not npm/yarn/pnpm
- **Prisma Version**: 7.1.0 with new adapter-based configuration (not compatible with Prisma 5 patterns)
- **Database Permissions**: Limited - cannot create shadow databases (affects migration commands)
- **Hot Reload**: Prisma singleton pattern prevents connection exhaustion during development
