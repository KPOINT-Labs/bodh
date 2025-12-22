# Technology Stack: Bodh

This document outlines the core technologies and frameworks used in the Bodh project.

## Frontend
- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [Shadcn UI](https://ui.shadcn.com/) (built on [Radix UI](https://www.radix-ui.com/))
- **State Management:** React Hooks / Context API (as needed)

## Backend & Database
- **Runtime:** [Node.js](https://nodejs.org/) (via Next.js)
- **Database:** [PostgreSQL](https://www.postgresql.org/)
- **ORM:** [Prisma](https://www.prisma.io/)
- **API Patterns:** Next.js Server Actions

## AI & Real-time Communication
- **Conversational AI:** [LiveKit Agents](https://livekit.io/) (for voice-enabled chatbot capabilities)

## Authentication & Security
- **Auth Library:** [Auth.js (NextAuth.js) v5](https://authjs.dev/)
- **Hashing:** [bcryptjs](https://www.npmjs.com/package/bcryptjs)

## Testing
- **Unit Testing:** [Vitest](https://vitest.dev/)
- **Component Testing:** [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

## Infrastructure & Tooling
- **Package Manager:** [Bun](https://bun.sh/)
- **Forms & Validation:** [React Hook Form](https://react-hook-form.com/), [Zod](https://zod.dev/)
- **Linting:** [ESLint](https://eslint.org/)
- **Version Control:** Git
