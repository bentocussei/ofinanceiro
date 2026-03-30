import { apiFetch } from "./client"

export interface DailyTip {
  id: string
  title: string
  content: string
  category: string
}

export interface PersonalizedTip extends DailyTip {
  ai_generated: boolean
  personalization_context: string | null
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

export interface LearningModule {
  id: string
  title: string
  description: string
  lessons_count: number
  completed_count: number
  tier: string
  level_required: number
  locked: boolean
}

export interface LearningPathTier {
  name: string
  modules: LearningModule[]
}

export interface LearningPathResponse {
  current_level: number
  tiers: LearningPathTier[]
  ai_generated: boolean
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  xp_reward: number
  earned: boolean
  earned_at: string | null
}

export interface AchievementsResponse {
  achievements: Achievement[]
  earned_count: number
  total_count: number
}

export interface AskResponse {
  question: string
  answer: string
  ai_generated: boolean
  sources: string[]
}

export interface EducationOverview {
  daily_tip: DailyTip | null
  challenges: Challenge[]
  profile: EducationProfile | null
  learning_path: LearningModule[]
  achievements: Achievement[]
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

  personalizedTip: (opts?: H) =>
    apiFetch<PersonalizedTip>("/api/v1/education/personalized-tip", opts),

  learningPath: (opts?: H) =>
    apiFetch<LearningPathResponse>("/api/v1/education/learning-path", opts),

  ask: (question: string, opts?: H) =>
    apiFetch<AskResponse>("/api/v1/education/ask", {
      method: "POST",
      body: JSON.stringify({ question }),
      ...opts,
    }),

  achievements: (opts?: H) =>
    apiFetch<AchievementsResponse>("/api/v1/education/achievements", opts),
}
