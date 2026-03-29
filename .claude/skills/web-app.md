---
description: Build Next.js 16 web app pages and components
globs: ["apps/web/**"]
---

# Web App Development (Next.js 16)

## Stack
- Next.js 16 with App Router (React 19, Turbopack default)
- Tailwind CSS v4 (CSS-first config, `@theme` directive, no tailwind.config.js)
- Shadcn UI v4
- Zustand v5 for client state
- TanStack React Query v5 for server state
- TypeScript strict mode

## Next.js 16 Key Patterns

### Async Request APIs (mandatory in v16)
```tsx
// cookies(), headers(), params, searchParams are ALL async now
import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')
  // ...
}

// Dynamic params are also async
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // ...
}
```

### Server Components (default)
- All components are Server Components by default
- Use `"use client"` only when needed (interactivity, hooks, browser APIs)
- Prefer Server Components for data fetching — no loading spinners needed
- Use React 19 `use()` hook for reading promises in client components

### React Compiler
- Next.js 16 supports React Compiler — auto-memoization
- Reduces need for manual `useMemo`, `useCallback`, `React.memo`
- Still use them for very expensive computations, but don't over-optimize

### Turbopack (default bundler)
- Turbopack is the default in v16 — no config needed
- Much faster HMR and cold starts vs Webpack
- If a package doesn't work with Turbopack, file an issue (rare now)

## Tailwind CSS v4 Patterns

### CSS-First Configuration
```css
/* globals.css — NO tailwind.config.js needed */
@import "tailwindcss";

@theme {
  --color-primary: oklch(0.6 0.2 260);
  --color-income: oklch(0.7 0.2 145);
  --color-expense: oklch(0.6 0.25 25);
  --color-savings: oklch(0.65 0.2 250);
  --color-warning: oklch(0.75 0.18 85);

  --font-sans: "Inter", sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  --spacing: 4px; /* base unit, utilities auto-multiply */
}
```

### Key v4 Changes
- Automatic content detection (no `content` config)
- Native CSS nesting support
- `@theme` replaces `theme.extend` in config
- CSS variables for all design tokens
- `@variant` for custom variants
- Dark mode via `@media (prefers-color-scheme: dark)` or class strategy

## Responsive Layout

```
Mobile (<768px):  Single column, bottom navigation
Tablet (768-1024): Two columns, collapsible sidebar
Desktop (>1024):  Three columns — sidebar | main content | AI chat panel
```

The AI assistant panel is always visible on desktop (right side).

## App Router Structure

```
apps/web/app/
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── (dashboard)/
│   ├── layout.tsx          # Sidebar + main + chat panel
│   ├── page.tsx            # Home dashboard
│   ├── accounts/page.tsx
│   ├── transactions/page.tsx
│   ├── budget/page.tsx
│   ├── goals/page.tsx
│   ├── family/page.tsx
│   ├── reports/page.tsx
│   └── settings/page.tsx
├── layout.tsx
└── globals.css
```

## Component Organization

```
apps/web/components/
├── ui/               # Shadcn UI primitives (auto-generated)
├── layout/           # Sidebar, Header, ChatPanel
├── transactions/     # TransactionList, TransactionForm, etc.
├── budget/           # BudgetCard, BudgetProgress, etc.
├── charts/           # Recharts-based visualizations
└── common/           # CurrencyDisplay, DatePicker, etc.
```

## Design System

### Typography
- UI text: Inter (via `--font-sans`)
- Numbers/currency: JetBrains Mono (via `--font-mono`)
- Headings: font-semibold, tracking-tight

### Colors (Shadcn theme via CSS variables)
- Dark mode ready via CSS variables
- Income: `--color-income` (green)
- Expense: `--color-expense` (red)
- Savings/goals: `--color-savings` (blue)
- Warnings: `--color-warning` (amber)

### Spacing
- 4px base unit defined in `@theme`
- Cards: p-4, gap-4
- Sections: py-8

## Data Fetching

- Server Components for initial page loads (SEO + performance) — no useEffect needed
- Client Components with TanStack React Query v5 for interactive/real-time data
- Optimistic updates for mutations via `useMutation` + `onMutate`
- Streaming with `loading.tsx` and React Suspense boundaries

## Zustand v5 Patterns

```tsx
// v5 uses a simplified API
import { create } from 'zustand'

interface AppState {
  selectedAccountId: string | null
  setSelectedAccount: (id: string | null) => void
}

const useAppStore = create<AppState>((set) => ({
  selectedAccountId: null,
  setSelectedAccount: (id) => set({ selectedAccountId: id }),
}))
```

## Charts & Visualizations

- Recharts for standard charts (pie, bar, line, area)
- Category breakdown: pie/donut chart
- Spending trends: area chart
- Budget progress: horizontal bar with threshold markers
- All charts must be responsive and support dark mode

## Key Rules

- All text in Portuguese (pt-AO)
- No UUIDs visible to users
- Currency always formatted: "150.000 Kz"
- Loading states: Shadcn Skeleton components
- Error states: meaningful Portuguese messages, retry buttons
- Keyboard navigation support (accessibility)
- Mobile-first CSS (min-width breakpoints)
- Use Server Components by default — `"use client"` only when necessary
- All `cookies()`, `headers()`, `params`, `searchParams` must be awaited (async)
