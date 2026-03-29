"use client"

import { useEffect, useState } from "react"
import {
  GraduationCap, Lightbulb, Trophy, Star, Flame, Award, CheckCircle2, Circle, RefreshCw,
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
        <h2 className="text-2xl font-bold tracking-tight">Educacao financeira</h2>
        <Button variant="outline" onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        {/* Profile card */}
        <div className="rounded-lg border bg-card p-4 md:row-span-2">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="h-5 w-5" />
            <h3 className="font-semibold">Meu perfil</h3>
          </div>

          {profile ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-accent mb-2">
                  <Star className="h-8 w-8 text-amber-500" />
                </div>
                <p className="text-2xl font-bold">Nivel {profile.level}</p>
                <p className="text-sm text-muted-foreground font-mono">{profile.total_xp} XP</p>
              </div>

              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progresso</span>
                  <span>{profile.xp_to_next_level} XP para o proximo nivel</span>
                </div>
                <div className="h-2 bg-muted rounded-full">
                  <div className="h-2 rounded-full bg-amber-500" style={{ width: `${xpProgress}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-muted p-2 text-center">
                  <Flame className="h-4 w-4 mx-auto text-orange-500 mb-1" />
                  <p className="font-bold">{profile.current_streak}</p>
                  <p className="text-xs text-muted-foreground">Dias seguidos</p>
                </div>
                <div className="rounded-lg bg-muted p-2 text-center">
                  <Trophy className="h-4 w-4 mx-auto text-amber-500 mb-1" />
                  <p className="font-bold">{profile.longest_streak}</p>
                  <p className="text-xs text-muted-foreground">Melhor sequencia</p>
                </div>
              </div>

              {/* Badges */}
              {profile.badges.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Insignias</p>
                  <div className="space-y-2">
                    {profile.badges.map((badge) => (
                      <div key={badge.id} className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-amber-500 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{badge.name}</p>
                          <p className="text-xs text-muted-foreground">{badge.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">A carregar perfil...</p>
          )}
        </div>

        {/* Daily tip */}
        <div className="rounded-lg border bg-card p-4 md:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold">Dica do dia</h3>
          </div>
          {tip ? (
            <div>
              {tip.category && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-medium">
                  {tip.category}
                </span>
              )}
              <h4 className="font-semibold mt-2">{tip.title}</h4>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{tip.content}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma dica disponivel hoje</p>
          )}
        </div>

        {/* Challenges */}
        <div className="rounded-lg border bg-card p-4 md:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold">Desafios</h3>
          </div>
          {challenges.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum desafio disponivel</p>
          ) : (
            <div className="space-y-3">
              {challenges.map((challenge) => {
                const isCompleted = challenge.status === "completed"
                return (
                  <div
                    key={challenge.id}
                    className={`flex items-start gap-3 rounded-lg p-3 ${isCompleted ? "bg-muted/50" : "bg-muted"}`}
                  >
                    <button
                      onClick={() => !isCompleted && handleCompleteChallenge(challenge.id)}
                      disabled={isCompleted}
                      className="mt-0.5 shrink-0"
                    >
                      {isCompleted
                        ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                        : <Circle className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                      }
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className={`font-medium ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                          {challenge.title}
                        </p>
                        <span className="text-xs font-mono font-bold text-amber-500">{challenge.xp_reward} XP</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{challenge.description}</p>
                      {challenge.difficulty && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-accent text-accent-foreground mt-1 inline-block">
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
  )
}
