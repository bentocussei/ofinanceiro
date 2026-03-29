import { apiFetch } from "./client"

export interface DailyTip {
  id: string
  title: string
  content: string
  category: string
}

export interface Challenge {
  id: string
  title: string
  description: string
  xp_reward: number
  status: "pending" | "in_progress" | "completed"
  difficulty: string
}

export interface EducationProfile {
  level: number
  total_xp: number
  xp_to_next_level: number
  current_streak: number
  longest_streak: number
  badges: { id: string; name: string; description: string; earned_at: string }[]
}

export interface EducationOverview {
  daily_tip: DailyTip | null
  challenges: Challenge[]
  profile: EducationProfile | null
}

export interface ChallengeCompleteResponse {
  success: boolean
  xp_earned: number
  total_xp: number
  level: number
}

type H = { headers?: Record<string, string> }

export const educationApi = {
  overview: (opts?: H) =>
    apiFetch<EducationOverview>("/api/v1/education/", opts),

  completeChallenge: (challengeId: string, opts?: H) =>
    apiFetch<ChallengeCompleteResponse>(
      "/api/v1/education/challenges/" + challengeId + "/complete",
      { method: "POST", ...opts },
    ),
}
