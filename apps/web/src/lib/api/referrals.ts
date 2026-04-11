import { apiFetch } from "./client"

export interface ReferralStats {
  referral_code: string
  total_referrals: number
  bonus_days_earned: number
  max_referrals: number
}

export const referralsApi = {
  stats: () => apiFetch<ReferralStats>("/api/v1/referrals/stats"),
}
