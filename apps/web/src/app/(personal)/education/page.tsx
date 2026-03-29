"use client"

import { useEffect, useState } from "react"
import {
  GraduationCap, Lightbulb, Trophy, Star, Flame, Award, CheckCircle2, Circle, RefreshCw, Zap,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"

interface DailyTip {
  id: string
  title: string
  content: string
  category: string
}

interface Challenge {
  id: string
  title: string
  description: string
  xp_reward: number
  status: "pending" | "in_progress" | "completed"
  difficulty: string
}

interface UserProfile {
  level: number
  total_xp: number
  xp_to_next_level: number
  current_streak: number
  longest_streak: number
  badges: { id: string; name: string; description: string; earned_at: string }[]
}

interface EducationData {
  daily_tip: DailyTip | null
  challenges: Challenge[]
  profile: UserProfile | null
}

export default function EducationPage() {
  const [tip, setTip] = useState<DailyTip | null>(null)
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const data = await apiFetch<EducationData>("/api/v1/education/")
      setTip(data.daily_tip)
      setChallenges(data.challenges)
      setProfile(data.profile)
    } catch { /* handled by apiFetch */ }
    setIsLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleCompleteChallenge = async (challengeId: string) => {
    try {
      await apiFetch(`/api/v1/education/challenges/${challengeId}/complete`, { method: "POST" })
      fetchData()
    } catch { /* handled by apiFetch */ }
  }

  const xpProgress = profile
    ? Math.round((profile.total_xp / (profile.total_xp + profile.xp_to_next_level)) * 100)
    : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[22px] font-bold tracking-tight">Educação financeira</h2>
        <Button variant="outline" onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Profile Card — top banner */}
      <div className="rounded-xl bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] mb-6">
        {profile ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            {/* Level badge */}
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Star className="h-7 w-7 text-amber-500" />
              </div>
              <div>
                <p className="text-xl font-bold">Nível{profile.level}</p>
                <p className="text-sm text-muted-foreground font-mono">{profile.total_xp} XP total</p>
              </div>
            </div>

            {/* XP Progress */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>Progresso para o próximo nível</span>
                <span className="font-mono">{profile.xp_to_next_level} XP restantes</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full">
                <div
                  className="h-2.5 rounded-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>

            {/* Streak + best */}
            <div className="flex gap-3 sm:gap-4">
              <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                <Flame className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="font-bold text-sm leading-none">{profile.current_streak}</p>
                  <p className="text-[11px] text-muted-foreground">dias</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="font-bold text-sm leading-none">{profile.longest_streak}</p>
                  <p className="text-[11px] text-muted-foreground">melhor</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <GraduationCap className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">A carregar perfil...</p>
          </div>
        )}

        {/* Badges */}
        {profile && profile.badges.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Insígnias</p>
            <div className="flex flex-wrap gap-2">
              {profile.badges.map((badge) => (
                <div
                  key={badge.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400"
                  title={badge.description}
                >
                  <Award className="h-3 w-3" />
                  {badge.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Tip */}
        <div className="rounded-xl bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="bg-amber-50 dark:bg-amber-900/20 px-5 py-3 flex items-center gap-2 border-b border-amber-100 dark:border-amber-900/30">
            <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Dica do dia</p>
          </div>
          <div className="p-5">
            {tip ? (
              <div>
                {tip.category && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium uppercase tracking-wide">
                    {tip.category}
                  </span>
                )}
                <h4 className="font-semibold text-[15px] mt-2">{tip.title}</h4>
                <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed">{tip.content}</p>
              </div>
            ) : (
              <div className="text-center py-6">
                <Lightbulb className="h-8 w-8 mx-auto text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground mt-2">Nenhuma dica disponível hoje</p>
              </div>
            )}
          </div>
        </div>

        {/* Challenges */}
        <div className="rounded-xl bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-5 py-3 flex items-center gap-2 border-b border-border">
            <Zap className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Desafios</p>
          </div>
          <div className="p-5">
            {challenges.length === 0 ? (
              <div className="text-center py-6">
                <Trophy className="h-8 w-8 mx-auto text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground mt-2">Nenhum desafio disponível</p>
              </div>
            ) : (
              <div className="space-y-3">
                {challenges.map((challenge) => {
                  const isCompleted = challenge.status === "completed"
                  return (
                    <div
                      key={challenge.id}
                      className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${
                        isCompleted ? "bg-muted/40" : "bg-muted/70 hover:bg-muted"
                      }`}
                    >
                      <button
                        onClick={() => !isCompleted && handleCompleteChallenge(challenge.id)}
                        disabled={isCompleted}
                        className="mt-0.5 shrink-0"
                      >
                        {isCompleted
                          ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                          : <Circle className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
                        }
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`font-medium text-sm ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                            {challenge.title}
                          </p>
                          <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[11px] font-mono font-bold text-amber-700 dark:text-amber-400">
                            +{challenge.xp_reward} XP
                          </span>
                        </div>
                        <p className="text-[12px] text-muted-foreground mt-0.5">{challenge.description}</p>
                        {challenge.difficulty && (
                          <span className="inline-block mt-1.5 text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                            {challenge.difficulty}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
