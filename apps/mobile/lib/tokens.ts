/**
 * Design tokens for O Financeiro mobile app.
 * Single source of truth for colors, spacing, typography, and radii.
 */

export const colors = {
  // Brand — Teal (matches web: Warm Cream + Teal identity)
  primary: '#0D9488',
  primaryDark: '#0F766E',
  primaryLight: '#CCFBF1',
  brand: '#0D9488',

  // Semantic
  success: '#15803D',
  successDark: '#166534',
  successLight: '#DCFCE7',
  error: '#B91C1C',
  errorDark: '#991B1B',
  errorLight: '#FEE2E2',
  warning: '#D97706',
  warningDark: '#B45309',
  warningLight: '#FEF3C7',
  orange: '#EA580C',
  purple: '#7C3AED',
  pink: '#DB2777',

  // Light theme — Warm Cream (matches web globals.css)
  light: {
    bg: '#FAF9F6',
    card: '#FFFFFF',
    cardAlt: '#F3F1ED',
    input: '#F3F1ED',
    text: '#1C1917',
    textSecondary: '#78716C',
    textMuted: '#A8A29E',
    border: '#E8E5E0',
    borderLight: '#F0EDE8',
    separator: '#F0EDE8',
    handle: '#D6D3CE',
    icon: '#78716C',
    overlay: 'rgba(0,0,0,0.4)',
  },

  // Dark theme — Warm Dark (matches web globals.css)
  dark: {
    bg: '#1A1816',
    card: '#242220',
    cardAlt: '#2A2826',
    input: '#2A2826',
    text: '#ECE9E4',
    textSecondary: '#9C9690',
    textMuted: '#6B6560',
    border: '#3D3A36',
    borderLight: '#302E2B',
    separator: '#3D3A36',
    handle: '#6B6560',
    icon: '#9C9690',
    overlay: 'rgba(0,0,0,0.6)',
  },
} as const

/** Get the color palette for the current scheme. */
export function themeColors(isDark: boolean) {
  return isDark ? colors.dark : colors.light
}

export const spacing = {
  '2xs': 2,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  '4xl': 32,
  '5xl': 40,
} as const

export const radii = {
  sm: 4,
  md: 8,
  lg: 10,
  xl: 12,
  '2xl': 16,
  full: 9999,
} as const

export const fontSize = {
  xs: 10,
  sm: 11,
  md: 12,
  base: 13,
  lg: 14,
  xl: 15,
  '2xl': 16,
  '3xl': 18,
  '4xl': 20,
  '5xl': 22,
  '6xl': 24,
  '7xl': 32,
} as const

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
}
