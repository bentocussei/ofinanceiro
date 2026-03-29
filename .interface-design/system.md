# O Financeiro — Design System

## Direction
**Personality:** A caderneta digital — banco privado angolano meets personal finance notebook
**Feel:** Calmo, confiável, organizado. Como ter um gestor financeiro privado.
**Foundation:** Warm cream + deep green (Kwanza-inspired)
**Depth:** Subtle shadows (premium lift, not borders)
**Signature:** Cards that feel like pages of a personal finance notebook — clean, warm, organized

## Who
Angolano(a) urbano(a), 25-45 anos. Opens app after work or Saturday morning. Wants clarity: "quanto tenho?", "quanto gastei?". Deals with cash, Multicaixa, Kixikila.

## Color Palette

### Primary — Deep Green (Kwanza prosperity)
- `--primary`: oklch(0.45 0.15 155) — #15803D range
- `--primary-foreground`: white

### Light Mode — Warm Cream (caderneta paper)
- `--background`: oklch(0.985 0.008 95) — warm cream, NOT cold white
- `--card`: oklch(1 0 0) — white cards on cream
- `--foreground`: oklch(0.18 0.02 60) — dark warm brown-black
- `--muted`: oklch(0.96 0.01 90) — warm gray
- `--muted-foreground`: oklch(0.50 0.02 60) — medium warm
- `--border`: oklch(0.92 0.008 90) — subtle warm border
- `--sidebar`: oklch(0.975 0.008 95) — slightly darker cream

### Dark Mode — Deep Warm Dark (NOT pure black)
- `--background`: oklch(0.14 0.01 70) — warm charcoal
- `--card`: oklch(0.19 0.01 70) — elevated surface
- `--foreground`: oklch(0.95 0.005 90) — warm white
- `--muted`: oklch(0.24 0.01 70)
- `--muted-foreground`: oklch(0.60 0.01 70)
- `--border`: oklch(0.28 0.01 70)
- `--sidebar`: oklch(0.16 0.01 70)

### Semantic
- Income: oklch(0.55 0.18 150) — green
- Expense: oklch(0.55 0.20 25) — warm red
- Warning: oklch(0.70 0.16 80) — amber
- Goal: oklch(0.55 0.15 250) — blue

### Charts
1. Deep green (primary)
2. Amber/gold
3. Blue
4. Purple
5. Teal

## Tokens

### Spacing (8px base)
- 4: micro (icon gaps)
- 8: component internal
- 12: tight component
- 16: standard component padding
- 20: card padding
- 24: section gap
- 32: major separation
- 48: page sections

### Radius
- 6px: inputs, buttons, badges
- 8px: small cards, dropdowns
- 12px: main cards
- 16px: modals, sheets

### Typography
- Display: 32px, 700, tabular-nums (net worth)
- H1: 22px, 700, tracking-tight (page title)
- H2: 15px, 600 (card title)
- H3: 12px, 600, uppercase, tracking-wide, muted (section label)
- Body: 14px, 400
- Small: 13px, 400, muted
- Caption: 11px, 400, muted
- Money: JetBrains Mono, tabular-nums, 600 weight
- Money large: 24-32px mono bold

### Shadows
- Card: 0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)
- Hover: 0 2px 8px rgba(0,0,0,0.08)
- Elevated: 0 4px 16px rgba(0,0,0,0.10)
- Dark card: 0 1px 3px rgba(0,0,0,0.3)

## Layout
- Sidebar: 240px, collapsible to 60px
- Main: full width with padding 24px (desktop), 16px (mobile). NO max-width.
- Chat: side panel WITHOUT overlay. Opens from right, 380px. Semi-transparent backdrop optional but NO block.
- Landing: / (root). Dashboard: route group (dashboard) with auth.

## Component Patterns

### Sidebar Nav Item
- Height: 38px, padding: 0 12px, radius: 6px
- Active: primary bg/10%, primary text, left 3px primary border
- Icon: 18px, gap 10px to label

### Card
- Background: card surface, shadow (not border)
- Padding: 20px, radius: 12px
- Clickable cards: hover shadow transition

### Transaction Row
- Height: 56px
- [Category dot 8px] [Description 14px/500] [Category 12px muted] → [Amount mono 14px/600 colored]

### Progress Bar
- Height: 6px, radius: 3px
- Green <70%, Amber 70-90%, Red >90%

### Dashboard Sections
- NOT vertical list. Use named sections in 2-col grid:
  - Left col: Net Worth hero (full), Cash Flow (full), Recent Transactions
  - Right col: Accounts, Budget Progress, Goals Progress, Spending by Category
