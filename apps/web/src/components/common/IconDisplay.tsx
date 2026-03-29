/**
 * Maps icon identifiers to Lucide icons.
 * Used to display account types, categories, goals, etc. without emojis.
 */

import {
  Banknote,
  BarChart3,
  BookOpen,
  Car,
  CreditCard,
  Gift,
  GraduationCap,
  Heart,
  Home,
  Landmark,
  Package,
  Pill,
  Plane,
  Receipt,
  Shield,
  ShoppingCart,
  Smartphone,
  Target,
  TrendingUp,
  Utensils,
  Users,
  Wallet,
  Zap,
} from "lucide-react"
import type { ElementType } from "react"

const ICON_MAP: Record<string, ElementType> = {
  // Account types
  bank: Landmark,
  digital_wallet: Smartphone,
  cash: Banknote,
  savings: Landmark,
  investment: TrendingUp,
  credit_card: CreditCard,
  loan: Receipt,

  // Goal types
  savings_goal: Target,
  emergency_fund: Shield,
  purchase: ShoppingCart,
  travel: Plane,
  event: Gift,
  education: GraduationCap,
  retirement: Home,
  custom: Target,

  // Category groups
  alimentacao: Utensils,
  casa: Home,
  transporte: Car,
  saude: Pill,
  filhos: Users,
  comunicacoes: Smartphone,
  lazer: Heart,
  educacao: GraduationCap,
  financeiro: Landmark,
  pessoal: Users,
  transferencias: Zap,
  receitas: Banknote,

  // Fallback
  default: Package,
}

interface Props {
  name?: string | null
  className?: string
}

export function IconDisplay({ name, className = "h-4 w-4" }: Props) {
  const Icon = (name && ICON_MAP[name.toLowerCase()]) || ICON_MAP.default
  return <Icon className={className} />
}

/**
 * Get icon component by name.
 */
export function getIcon(name?: string | null): ElementType {
  if (!name) return ICON_MAP.default
  return ICON_MAP[name.toLowerCase()] || ICON_MAP.default
}
