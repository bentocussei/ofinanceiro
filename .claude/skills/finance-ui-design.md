---
description: Design system and UX patterns for O Financeiro — modern financial app UI
globs: ["apps/web/**", "apps/mobile/**"]
alwaysApply: true
---

# Finance App UI/UX Design System

## Color System

### Light Mode
- Background: `#F8FAFC` (slate-50)
- Card: `#FFFFFF` with subtle shadow (`0 1px 3px rgba(0,0,0,0.08)`)
- Foreground: `#0F172A` (slate-900)
- Muted: `#64748B` (slate-500)
- Border: `#E2E8F0` (slate-200)
- Primary/Brand: `#0D9488` (teal-600) — calming, trustworthy
- Income: `#16A34A` (green-600)
- Expense: `#DC2626` (red-600) or `#F87171` (red-400, softer)
- Warning: `#D97706` (amber-600)
- Goal/Savings: `#2563EB` (blue-600)

### Dark Mode (NEVER pure black)
- Background: `#0F172A` (slate-900, blue-tinted)
- Card: `#1E293B` (slate-800)
- Foreground: `#F1F5F9` (slate-100)
- Muted: `#94A3B8` (slate-400)
- Border: `#334155` (slate-700)
- Desaturate semantic colors ~10% in dark mode

## Typography

- **Headings**: Inter, 600-700 weight, tracking-tight
- **Body**: Inter, 400 weight, 14-16px
- **Monetary amounts**: ALWAYS `font-variant-numeric: tabular-nums` or JetBrains Mono
  - This is CRITICAL — tabular figures align decimal points in columns
- **Large hero numbers**: 28-36px, bold, monospace
- **Small labels**: 12px, muted color, uppercase for category labels

## Card Design

- Border-radius: 12-16px
- Padding: 20-24px
- Shadow: `0 1px 3px rgba(0,0,0,0.08)` (light), `0 1px 2px rgba(0,0,0,0.3)` (dark)
- NO harsh borders as primary separator — use shadow or subtle border
- Spacing between cards: 16-24px

## Dashboard Layout

Priority order of cards:
1. **Net Worth / Total Balance** (hero, full-width, largest number on page)
2. **Cash Flow** (income vs expenses this month, simple comparison)
3. **Spending by Category** (donut chart or horizontal bars, top 5-7)
4. **Account Balances** (grouped by type)
5. **Budget Progress** (top categories with progress bars)
6. **Recent Transactions** (last 5-10, link to full list)
7. **Goals Progress** (if applicable)
8. **Daily Tip / Insight** (if available)

Desktop: 2-3 column grid for cards
Tablet: 2 columns
Mobile: single column, full-width cards

## Transaction List

- Group by date with sticky headers
- Each row: [Category Icon] Merchant/Description (primary) + Category·Account (secondary) + Amount (right, colored)
- Row height: 56-64px
- Search bar always visible or one-tap
- Filter chips: Type, Category, Date range, Account
- Active filters as dismissible chips
- Click/tap → detail panel (not full page navigation on desktop)
- Infinite scroll, skeleton loaders

## Budget Visualization

- Horizontal progress bars per category
- Traffic-light: Green (<70%), Amber (70-90%), Red (>90%)
- Show: icon + name + spent/limit + remaining
- Sort by most spent or most over budget
- Total bar at top for overview

## Sidebar Navigation (Desktop)

- Width: 240-260px, collapsible to 64px (icons only)
- Items: icon + label, 44-48px height each
- Active state: left accent border + background tint
- Sections: Main (Dashboard, Transactions, Budget, Accounts, Goals) + Secondary (Family, Reports, Settings)
- User avatar + name at bottom

## What Makes It Premium

1. Smooth animations (Framer Motion for page transitions, number counting)
2. Skeleton loaders (never blank screens)
3. Tabular figures for ALL money
4. Generous but intentional whitespace
5. Consistent icon set (Lucide only)
6. Color used semantically, not decoratively
7. Subtle shadows, not harsh borders
8. Micro-interactions (hover scale on cards, button press feedback)
9. Empty states with helpful illustrations and CTAs
10. Transitions between pages (not hard cuts)

## Rules

- NEVER show raw UUIDs, timestamps, or technical data to users
- ALWAYS format currency: "150.000 Kz" with tabular figures
- ALWAYS use relative dates: "Hoje", "Ontem", "15 Mar"
- Loading: skeleton screens, NEVER spinners
- Empty states: icon + message + CTA button
- Errors: inline messages in Portuguese, retry buttons
- ALL text in Portuguese (pt-AO)
