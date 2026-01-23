---
applyTo: "**/*.{ts,tsx,js,jsx}"
---

# Ultracite (Biome) Linting

## Commands
- `bun run lint` - Check issues
- `bun run lint:fix` - Auto-fix issues

## Key Rules

- Prefer `unknown` over `any`
- Use `for...of` over `.forEach()`
- Use `async/await` over promise chains
- No `console.log` in production code
- Use Next.js `<Image>` component for images
- React 19: Use ref as prop instead of `forwardRef`
- Hooks at top level only, never conditionally
- Use semantic HTML (`<button>`, `<nav>`) over divs with roles

Run `bun run lint:fix` before committing.
