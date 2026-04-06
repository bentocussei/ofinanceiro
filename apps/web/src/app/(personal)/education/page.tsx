"use client"

import { useEffect, useState } from "react"
import {
  GraduationCap, Lightbulb, Trophy, Star, Flame, Award, CheckCircle2, Circle,
  RefreshCw, Zap, Lock, BookOpen, Send, MessageCircle, Target,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  educationApi,
  type DailyTip,
  type Challenge,
  type EducationProfile,
  type LearningModule,
  type Achievement,
} from "@/lib/api/education"

// ---------------------------------------------------------------------------
// Difficulty badge color helpers
// ---------------------------------------------------------------------------

function difficultyColor(difficulty: string) {
  switch (difficulty) {
    case "Fácil":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    case "Médio":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    case "Difícil":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    default:
      return "bg-muted text-muted-foreground"
  }
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function EducationPage() {
  const [tip, setTip] = useState<DailyTip | null>(null)
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [profile, setProfile] = useState<EducationProfile | null>(null)
  const [learningPath, setLearningPath] = useState<LearningModule[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Ask AI state
  const [question, setQuestion] = useState("")
  const [aiAnswer, setAiAnswer] = useState<string | null>(null)
  const [askingAi, setAskingAi] = useState(false)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const data = await educationApi.overview()
      setTip(data.daily_tip)
      setChallenges(data.challenges)
      setProfile(data.profile)
      setLearningPath(data.learning_path ?? [])
      setAchievements(data.achievements ?? [])
    } catch { /* handled by apiFetch */ }
    setIsLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleCompleteChallenge = async (challengeId: string) => {
    try {
      await educationApi.completeChallenge(challengeId)
      fetchData()
    } catch { /* handled by apiFetch */ }
  }

  const handleAsk = async () => {
    const q = question.trim()
    if (!q) return
    setAskingAi(true)
    setAiAnswer(null)
    try {
      const res = await educationApi.ask(q)
      setAiAnswer(res.answer)
    } catch {
      toast.error("Não foi possível obter resposta.")
    }
    setAskingAi(false)
  }

  const handleModuleClick = (mod: LearningModule) => {
    if (mod.locked) {
      toast.info(`Nível ${mod.level_required} necessário para desbloquear este módulo.`)
    } else {
      toast.info("As lições estarão disponíveis em breve.")
    }
  }

  const xpProgress = profile
    ? Math.round((profile.total_xp / (profile.total_xp + profile.xp_to_next_level)) * 100)
    : 0

  // Group challenges by difficulty
  const challengesByDifficulty = ["Fácil", "Médio", "Difícil"].map((d) => ({
    difficulty: d,
    items: challenges.filter((c) => c.difficulty === d),
  })).filter((g) => g.items.length > 0)

  const earnedCount = achievements.filter((a) => a.earned).length

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <h2 className="text-[22px] font-bold tracking-tight">Educacao financeira</h2>
        <Button variant="outline" onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* 1. Profile Card */}
      <div className="rounded-xl bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] mb-6">
        {profile ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Star className="h-7 w-7 text-amber-500" />
              </div>
              <div>
                <p className="text-xl font-bold">Nivel {profile.level}</p>
                <p className="text-sm text-muted-foreground font-mono">{profile.total_xp} XP total</p>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>Progresso para o proximo nivel</span>
                <span className="font-mono">{profile.xp_to_next_level} XP restantes</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full">
                <div
                  className="h-2.5 rounded-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>

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
              <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                <Award className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="font-bold text-sm leading-none">{earnedCount}</p>
                  <p className="text-[11px] text-muted-foreground">insignias</p>
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

        {profile && profile.badges.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Insignias</p>
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

      {/* 2. Daily Tip + Ask AI (side by side) */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
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
                <p className="text-sm text-muted-foreground mt-2">Nenhuma dica disponivel hoje</p>
              </div>
            )}
          </div>
        </div>

        {/* Ask AI */}
        <div className="rounded-xl bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="bg-purple-50 dark:bg-purple-900/20 px-5 py-3 flex items-center gap-2 border-b border-purple-100 dark:border-purple-900/30">
            <MessageCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <p className="text-sm font-semibold text-purple-800 dark:text-purple-300">Pergunte a IA sobre financas</p>
          </div>
          <div className="p-5">
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                placeholder="Ex: Como comecar a poupar?"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={askingAi}
              />
              <Button onClick={handleAsk} disabled={askingAi || !question.trim()} size="sm" className="shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {askingAi && (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                A processar...
              </div>
            )}
            {aiAnswer && (
              <div className="mt-3 rounded-lg bg-muted/60 p-3">
                <p className="text-sm leading-relaxed">{aiAnswer}</p>
                <p className="text-[11px] text-muted-foreground mt-2 italic">Resposta automatica — IA em breve</p>
              </div>
            )}
            {!askingAi && !aiAnswer && (
              <p className="text-[12px] text-muted-foreground mt-3">
                A IA vai responder a questoes sobre orcamento, poupanca, investimentos e mais.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 3. Learning Path */}
      {learningPath.length > 0 && (
        <div className="rounded-xl bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden mb-6">
          <div className="px-5 py-3 flex items-center gap-2 border-b border-border">
            <BookOpen className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Percurso de aprendizagem</p>
            {profile && (
              <span className="ml-auto text-[11px] text-muted-foreground">Nivel {profile.level}</span>
            )}
          </div>
          <div className="p-5">
            {/* Group by tier */}
            {["Fundamentos", "Intermédio", "Avançado"].map((tierName) => {
              const tierModules = learningPath.filter((m) => m.tier === tierName)
              if (tierModules.length === 0) return null
              return (
                <div key={tierName} className="mb-5 last:mb-0">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{tierName}</h4>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {tierModules.map((mod) => (
                      <button
                        key={mod.id}
                        onClick={() => handleModuleClick(mod)}
                        className={`text-left rounded-lg border p-3 transition-colors ${
                          mod.locked
                            ? "border-dashed border-muted-foreground/20 opacity-60"
                            : "border-border hover:border-primary/40 hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className={`font-medium text-sm ${mod.locked ? "text-muted-foreground" : ""}`}>
                            {mod.title}
                          </p>
                          {mod.locked ? (
                            <Lock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          ) : mod.completed_count === mod.lessons_count ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                          ) : null}
                        </div>
                        <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{mod.description}</p>
                        {mod.locked ? (
                          <p className="text-[11px] text-muted-foreground mt-2 font-medium">
                            Nivel {mod.level_required} necessario
                          </p>
                        ) : (
                          <div className="mt-2">
                            <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                              <span>{mod.completed_count}/{mod.lessons_count} licoes</span>
                              <span className="font-mono">{Math.round((mod.completed_count / mod.lessons_count) * 100)}%</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full">
                              <div
                                className="h-1.5 rounded-full bg-primary transition-all duration-300"
                                style={{ width: `${(mod.completed_count / mod.lessons_count) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 4. Challenges */}
      <div className="rounded-xl bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden mb-6">
        <div className="px-5 py-3 flex items-center gap-2 border-b border-border">
          <Zap className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Desafios</p>
          <span className="ml-auto text-[11px] text-muted-foreground">
            {challenges.filter((c) => c.status === "completed").length}/{challenges.length} concluidos
          </span>
        </div>
        <div className="p-5">
          {challenges.length === 0 ? (
            <div className="text-center py-6">
              <Trophy className="h-8 w-8 mx-auto text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground mt-2">Nenhum desafio disponivel</p>
            </div>
          ) : (
            <div className="space-y-5">
              {challengesByDifficulty.map((group) => (
                <div key={group.difficulty}>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2.5">
                    {group.difficulty}
                  </h4>
                  <div className="space-y-2">
                    {group.items.map((challenge) => {
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
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. Achievements */}
      {achievements.length > 0 && (
        <div className="rounded-xl bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-5 py-3 flex items-center gap-2 border-b border-border">
            <Target className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Conquistas</p>
            <span className="ml-auto text-[11px] text-muted-foreground">
              {earnedCount}/{achievements.length} desbloqueadas
            </span>
          </div>
          <div className="p-5">
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              {achievements.map((ach) => (
                <div
                  key={ach.id}
                  className={`rounded-lg border p-3 text-center transition-colors ${
                    ach.earned
                      ? "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10"
                      : "border-border opacity-50"
                  }`}
                >
                  <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full mb-2 ${
                    ach.earned
                      ? "bg-amber-100 dark:bg-amber-900/30"
                      : "bg-muted"
                  }`}>
                    {ach.earned
                      ? <CheckCircle2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      : <Lock className="h-4 w-4 text-muted-foreground" />
                    }
                  </div>
                  <p className={`text-xs font-semibold ${ach.earned ? "" : "text-muted-foreground"}`}>
                    {ach.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{ach.description}</p>
                  <span className="inline-block mt-1.5 text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
                    +{ach.xp_reward} XP
                  </span>
                  {ach.earned && ach.earned_at && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(ach.earned_at).toLocaleDateString("pt-AO")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
