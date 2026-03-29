---
description: Build React Native + Expo mobile app screens and components
globs: ["apps/mobile/**"]
---

# Mobile App Development (React Native 0.84+ / Expo SDK 55)

## Stack
- React Native 0.84+ (New Architecture default: Fabric + TurboModules, bridgeless)
- Expo SDK 55
- Expo Router v4 (file-based routing)
- NativeWind v4 (Tailwind CSS v4 for React Native)
- Zustand v5 for local state
- TanStack React Query v5 for server state
- Expo SecureStore for sensitive data
- react-native-mmkv for offline storage

## New Architecture (default since RN 0.76)

React Native New Architecture is now the default — do NOT disable it:
- **Fabric**: New rendering system (replaces old renderer)
- **TurboModules**: Lazy-loaded native modules with JSI (replaces old bridge)
- **Bridgeless mode**: No more bridge — direct JS-to-native communication
- **Codegen**: Type-safe native module specs from TypeScript

All libraries should be New Architecture compatible. If a library doesn't support it, find an alternative.

## Navigation Structure

```
app/
├── (auth)/
│   ├── login.tsx          # Phone + OTP
│   ├── register.tsx       # Onboarding flow
│   └── _layout.tsx
├── (tabs)/
│   ├── index.tsx          # Home dashboard
│   ├── budget.tsx         # Budget overview
│   ├── chat.tsx           # AI Assistant
│   ├── reports.tsx        # Reports & analytics
│   └── more.tsx           # Settings, goals, debts, etc.
├── (modals)/
│   ├── add-transaction.tsx
│   ├── account-detail.tsx
│   └── ...
└── _layout.tsx
```

## Expo SDK 55 Features

- Use `expo-camera` (v16+) for receipt scanning
- Use `expo-image` (v3+) for optimized image loading and caching
- Use `expo-haptics` for tactile feedback
- Use `expo-local-authentication` for biometrics
- Use `expo-notifications` for push notifications
- Use `expo-secure-store` for tokens and sensitive data
- Use `expo-splash-screen` for controlled splash screen

## NativeWind v4 (Tailwind CSS v4 for RN)

```tsx
// NativeWind v4 uses Tailwind v4 CSS-first config
// Same @theme tokens as web app for consistency
import { View, Text } from 'react-native'

export function Balance({ amount }: { amount: number }) {
  return (
    <View className="bg-card rounded-2xl p-4">
      <Text className="font-mono text-2xl text-right">
        {formatCurrency(amount)}
      </Text>
    </View>
  )
}
```

## UI Patterns

### Floating Action Button (FAB)
- Always visible on main screens
- Primary action: add transaction
- Long press: quick actions menu (voice, photo, transfer)

### Bottom Sheets
- Use `@gorhom/bottom-sheet` (v5, New Arch compatible)
- Swipe down to dismiss
- Use for forms, filters, confirmations

### Transaction List
- Grouped by date
- `FlashList` from `@shopify/flash-list` (faster than FlatList for large lists)
- Swipe actions with `react-native-gesture-handler`
- Pull-to-refresh
- Infinite scroll with cursor-based pagination

### Numbers & Currency
- Always use JetBrains Mono (monospaced)
- Right-aligned
- Format: "150.000 Kz" (dot as thousand separator)
- Green for income, red for expenses

## Offline-First Strategy

1. **MMKV**: Cache recent transactions, accounts, budgets locally
2. **Sync queue**: Queue mutations when offline, sync when back online
3. **Optimistic updates**: Show changes immediately, reconcile on sync
4. **Conflict resolution**: Server wins, but notify user of conflicts
5. **React Query `networkMode: 'offlineFirst'`**: Serve from cache, sync in background

## Performance Rules

- `FlashList` for large data lists (transactions) — FlatList for small lists
- React Compiler (via Expo SDK 55) handles most memoization automatically
- Use `useCallback` only for truly expensive callbacks passed to deep trees
- Image caching with `expo-image` (built-in disk + memory cache)
- Skeleton loaders for all data-dependent screens
- Avoid inline styles in render — use NativeWind classes
- Target: <2s initial load, <100ms interaction response
- Hermes JS engine (default) — optimized for RN

## Auth Flow

1. Phone number input → SMS OTP
2. Verify OTP → JWT (access + refresh tokens)
3. Store tokens in SecureStore (encrypted on device)
4. Auto-refresh on 401 responses via React Query auth interceptor
5. Biometric/PIN for app lock (optional, via `expo-local-authentication`)

## Push Notifications

- `expo-notifications` + FCM (Android) / APNS (iOS)
- Register push token on login, store in `push_tokens` table
- Categories: insights, reminders, budget_alerts, family
- Respect quiet hours setting
- Use notification channels on Android for user control

## Key Rules

- All text in Portuguese (pt-AO)
- Test on Android primarily (70%+ of Angola market)
- Handle slow/no internet gracefully — never show blank screens
- Use platform-specific patterns where appropriate (Android back button, iOS swipe back)
- Haptic feedback for confirmations (`Haptics.impactAsync`)
- New Architecture must stay enabled — do not add `newArchEnabled: false`
- All native modules must be New Architecture compatible
