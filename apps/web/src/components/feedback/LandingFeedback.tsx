"use client"

import { Star } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { feedbackApi } from "@/lib/api/feedback"

const API_URL = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
  : "http://localhost:8000"

function StarRating({
  value,
  onChange,
  size = "md",
}: {
  value: number
  onChange?: (v: number) => void
  size?: "sm" | "md" | "lg"
}) {
  const [hover, setHover] = useState(0)
  const active = onChange ? (hover || value) : value
  const sizeClass = size === "lg" ? "h-8 w-8" : size === "sm" ? "h-4 w-4" : "h-6 w-6"

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          onMouseEnter={() => onChange && setHover(n)}
          onMouseLeave={() => onChange && setHover(0)}
          disabled={!onChange}
          className={`p-0.5 transition-transform focus:outline-none ${onChange ? "hover:scale-110 cursor-pointer" : "cursor-default"}`}
          aria-label={onChange ? `${n} estrela${n > 1 ? "s" : ""}` : undefined}
        >
          <Star
            className={`${sizeClass} transition-colors ${
              n <= active
                ? "fill-amber-400 text-amber-400"
                : "fill-muted text-muted-foreground/40"
            }`}
          />
        </button>
      ))}
    </div>
  )
}

export function LandingFeedback() {
  const [avgRating, setAvgRating] = useState<number | null>(null)
  const [ratingCount, setRatingCount] = useState(0)
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState("")
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    feedbackApi
      .summary()
      .then((s) => {
        setAvgRating(s.average_rating)
        setRatingCount(s.rating_count)
      })
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) {
      toast.error("Por favor seleccione uma avaliação")
      return
    }
    setSubmitting(true)
    try {
      // Use fetch directly so it works without auth headers for anonymous users
      const res = await fetch(`${API_URL}/api/v1/feedback/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "rating",
          rating,
          message: message.trim() || undefined,
          contact_name: name.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const msg = body?.detail ?? "Erro ao enviar avaliação"
        throw new Error(typeof msg === "string" ? msg : "Erro ao enviar avaliação")
      }
      setSubmitted(true)
      toast.success("Avaliação enviada. Obrigado pelo seu feedback!")
      // update local average optimistically
      const newCount = ratingCount + 1
      const newAvg = avgRating !== null
        ? ((avgRating * ratingCount) + rating) / newCount
        : rating
      setAvgRating(newAvg)
      setRatingCount(newCount)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar"
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="py-14 md:py-20 border-t border-border">
      <div className="mx-auto px-4 md:px-8 max-w-[1600px]">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 items-start">
          {/* Left — aggregate rating */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
              O que dizem os utilizadores
            </p>
            {avgRating !== null && ratingCount > 0 ? (
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-5xl font-bold font-mono tracking-tight">
                    {avgRating.toFixed(1)}
                  </p>
                </div>
                <div className="space-y-1">
                  <StarRating value={Math.round(avgRating)} size="lg" />
                  <p className="text-sm text-muted-foreground">
                    {ratingCount.toLocaleString("pt-AO")}{" "}
                    {ratingCount === 1 ? "avaliação" : "avaliações"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Seja o primeiro a avaliar a aplicação.
              </p>
            )}
          </div>

          {/* Right — inline form */}
          <div className="rounded-xl bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)]">
            {submitted ? (
              <div className="flex flex-col items-center text-center py-6 gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Star className="h-6 w-6 text-primary fill-primary" />
                </div>
                <p className="font-semibold">Obrigado pela sua avaliação!</p>
                <p className="text-sm text-muted-foreground">
                  O seu feedback ajuda-nos a melhorar a aplicação.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">A sua avaliação</p>
                  <StarRating value={rating} onChange={setRating} size="lg" />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="lf-message" className="text-xs text-muted-foreground">
                    Comentário (opcional)
                  </label>
                  <textarea
                    id="lf-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="O que mais gosta? O que podemos melhorar?"
                    rows={3}
                    className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="lf-name" className="text-xs text-muted-foreground">
                    Nome (opcional)
                  </label>
                  <input
                    id="lf-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="O seu nome"
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || rating === 0}
                  className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "A enviar..." : "Enviar avaliação"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
