import { apiFetch } from "./client"

export interface ReferralStats {
  referral_code: string
  total_referrals: number
  bonus_days_earned: number
  max_referrals: number
}

export const referralsApi = {
  stats: () => apiFetch<ReferralStats>("/api/v1/referrals/stats"),

  apply: (code: string) =>
    apiFetch<{ success: boolean; message: string; bonus_days: number }>(
      "/api/v1/referrals/apply",
      {
        method: "POST",
        body: JSON.stringify({ referral_code: code }),
      }
    ),
}
