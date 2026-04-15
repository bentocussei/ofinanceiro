/**
 * Maps icon identifiers to Ionicons names.
 * Used to display account types, categories, goals, etc. without emojis.
 */

import { Ionicons } from '@expo/vector-icons'

import { colors } from '../../lib/tokens'

const ICON_MAP: Record<string, string> = {
  // Account types
  bank: 'business-outline',
  digital_wallet: 'phone-portrait-outline',
  cash: 'cash-outline',
  savings: 'business-outline',
  investment: 'trending-up-outline',
  credit_card: 'card-outline',
  loan: 'document-text-outline',

  // Goal types
  savings_goal: 'flag-outline',
  emergency_fund: 'shield-outline',
  purchase: 'cart-outline',
  travel: 'airplane-outline',
  event: 'gift-outline',
  education: 'school-outline',
  retirement: 'home-outline',
  custom: 'flag-outline',

  // Category groups
  alimentacao: 'restaurant-outline',
  casa: 'home-outline',
  transporte: 'car-outline',
  saúde: 'medkit-outline',
  filhos: 'people-outline',
  comunicacoes: 'phone-portrait-outline',
  lazer: 'heart-outline',
  educacao: 'school-outline',
  financeiro: 'business-outline',
  pessoal: 'person-outline',
  transferências: 'swap-horizontal-outline',
  receitas: 'cash-outline',

  // Fallback
  default: 'cube-outline',
}

interface Props {
  name?: string | null
  size?: number
  color?: string
}

export default function IconDisplay({ name, size = 20, color = colors.light.textSecondary }: Props) {
  const iconName = (name && ICON_MAP[name.toLowerCase()]) || ICON_MAP.default
  return <Ionicons name={iconName as any} size={size} color={color} />
}

export function getIconName(name?: string | null): string {
  if (!name) return ICON_MAP.default
  return ICON_MAP[name.toLowerCase()] || ICON_MAP.default
}
