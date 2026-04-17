<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

Next.js 16 has breaking changes. Read `node_modules/next/dist/docs/` before writing code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Tech Stack

- **Next.js**: 16.2.4 (App Router, RSC)
- **React**: 19.2.4
- **Tailwind CSS**: v4 (CSS-based config via `@theme` in `globals.css`, no `tailwind.config.js`)
- **TypeScript**: strict mode
- **Font**: Geist via `next/font/google`

## Commands

```bash
npm run dev    # Start dev server (http://localhost:3000)
npm run build  # Production build
npm run start  # Start production server
npm run lint   # ESLint
```

## Tailwind v4 Config

Tailwind v4 uses CSS-based configuration in `app/globals.css`. Use `@theme` directive instead of `tailwind.config.js`:

```css
@import "tailwindcss";
@theme inline {
  --color-primary: #something;
}
```

## Available Skills

The `.claude/skills/` directory contains specialized skills. Key ones:
- `next-best-practices/`: Next.js patterns (RSC, data fetching, metadata, etc.)
- `tailwind-css-patterns/`: Tailwind utilities and v4 patterns
- `vercel-react-best-practices/`: React performance optimization
- `vercel-composition-patterns/`: Component composition patterns
- `next-cache-components/`: Next.js 16 cache directives

## TypeScript

Path alias: `@/*` maps to project root. Import with `import "@/path/to/file"`.

## No Test Suite

This project has no test configuration or test scripts.
