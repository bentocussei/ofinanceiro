import { apiFetch } from "./client"

export interface ReferralStats {
  referral_code: string
  total_referrals: number
  bonus_days_earned: number
  max_referrals: number
  share_message: string
}

export const referralsApi = {
  stats: () => apiFetch<ReferralStats>("/api/v1/referrals/stats"),
}
