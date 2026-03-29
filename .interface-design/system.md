# O Financeiro — Design System

## Direction
**Personality:** Sophistication & Trust
**Foundation:** Warm neutral (stone/amber base, NOT slate gray)
**Depth:** Subtle shadows + border accent (layered, premium feel)
**Feel:** Trustworthy, calming, professional — like a private banker, not a spreadsheet

## Brand Colors
- **Primary:** Teal `#0D9488` (teal-600) — trustworthy, calming
- **Primary Dark:** `#0F766E` (teal-700)
- **Primary Light:** `#99F6E4` (teal-200)
- **Accent:** Amber `#D97706` (amber-600) — warmth, attention

## Semantic Colors
- **Income:** `#16A34A` (green-600) / dark: `#4ADE80` (green-400)
- **Expense:** `#DC2626` (red-600) / dark: `#F87171` (red-400)
- **Warning:** `#D97706` (amber-600) / dark: `#FBBF24` (amber-400)
- **Goal/Savings:** `#2563EB` (blue-600) / dark: `#60A5FA` (blue-400)
- **Family:** `#9333EA` (purple-600) / dark: `#C084FC` (purple-400)

## Light Mode Palette
- **Background:** `#FAFAF9` (stone-50) — warm, NOT cold gray
- **Card/Surface:** `#FFFFFF` with shadow `0 1px 3px rgba(0,0,0,0.06)`
- **Sidebar:** `#F5F5F4` (stone-100) with right border
- **Foreground:** `#1C1917` (stone-900)
- **Muted text:** `#78716C` (stone-500)
- **Border:** `#E7E5E4` (stone-200)
- **Hover:** `#F5F5F4` (stone-100)

## Dark Mode Palette (blue-tinted, NEVER pure black)
- **Background:** `#1C1917` (stone-900)
- **Card/Surface:** `#292524` (stone-800) with shadow `0 1px 2px rgba(0,0,0,0.4)`
- **Sidebar:** `#1C1917` (stone-900) with right border
- **Foreground:** `#FAFAF9` (stone-50)
- **Muted text:** `#A8A29E` (stone-400)
- **Border:** `#44403C` (stone-700)
- **Hover:** `#292524` (stone-800)

## Tokens

### Spacing
Base: 4px
Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64
- Micro: 4px (between icon and label)
- Component: 8-12px (internal padding of chips, badges)
- Card padding: 20-24px
- Section gap: 24-32px
- Page margin: 32-48px

### Border Radius
- Small (chips, badges): 6px
- Medium (buttons, inputs): 8px
- Large (cards): 12px
- XL (modals, sheets): 16px
- Full (avatars, FAB): 9999px

### Typography
- **Display (net worth):** 36px, 700 weight, tabular-nums, tracking-tight
- **Heading 1 (page title):** 24px, 700 weight, tracking-tight
- **Heading 2 (card title):** 16px, 600 weight
- **Heading 3 (section):** 14px, 600 weight, uppercase, letter-spacing 0.05em, muted
- **Body:** 14px, 400 weight
- **Body small:** 13px, 400 weight, muted
- **Caption:** 12px, 400 weight, muted
- **Money (all amounts):** font-variant-numeric: tabular-nums, font-family: 'JetBrains Mono'
- **Money large:** 24-36px, 700 weight, mono
- **Money inline:** 14px, 600 weight, mono

### Shadows
- **Card:** `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)`
- **Card hover:** `0 4px 12px rgba(0,0,0,0.08)`
- **Elevated (modal):** `0 8px 24px rgba(0,0,0,0.12)`
- **Dark card:** `0 1px 3px rgba(0,0,0,0.3)`

## Patterns

### Button Primary
- Height: 40px
- Padding: 10px 20px
- Radius: 8px
- Background: primary (teal-600)
- Text: white, 14px, 500 weight
- Hover: teal-700
- Active: scale(0.98)

### Card Default
- Background: card surface
- Border: none (shadow-based depth)
- Padding: 20px
- Radius: 12px
- Shadow: card shadow
- Hover: card hover shadow (for clickable cards)

### Input
- Height: 40px
- Padding: 0 12px
- Radius: 8px
- Border: 1px solid border color
- Focus: ring-2 primary with 20% opacity
- Font: 14px

### Sidebar Navigation Item
- Height: 40px
- Padding: 8px 12px
- Radius: 8px
- Gap: 12px (icon to label)
- Active: primary/10% background + primary text + left 3px accent border
- Hover: hover background
- Icon: 18px, muted → active: primary

### Transaction Row
- Height: 60px
- Layout: [icon 36px round] [merchant + category] [amount right-aligned]
- Icon: category-colored circle with Lucide icon
- Merchant: 14px, 500 weight
- Category + Account: 12px, muted
- Amount: 14px, 600 weight, mono, colored (green/red)
- Hover: subtle background
- Border-bottom: 1px border

### Progress Bar (Budget)
- Height: 8px
- Radius: 4px
- Background: muted/10%
- Fill: green (<70%), amber (70-90%), red (>90%)
- Animation: width transition 0.5s ease

### Dashboard Net Worth Hero
- Full-width card at top
- Large number: 36px mono bold
- Trend: up/down arrow + percentage + sparkline
- Subtitle: "Saldo total" in muted 14px
- Background: slight gradient or elevated card

## Component Library (Shadcn)
Required components:
- Button, Input, Label, Textarea
- Dialog, Sheet, Drawer
- Select, Command (command palette)
- Table (DataTable for transactions)
- Tabs, Badge, Avatar
- Sonner (toast notifications)
- Tooltip, Popover, DropdownMenu
- Skeleton (loading)
- Separator
- Switch, Checkbox
- Calendar, DatePicker
- Progress
- Chart (recharts integration)

## Layout
- **Sidebar:** 256px, collapsible to 64px (icon-only)
- **Main content:** flex-1, max-width 1200px centered, padding 32px
- **Chat:** toggle button (bottom-right), opens Sheet/Drawer (NOT permanent panel)
- **Mobile:** sidebar becomes hamburger drawer
