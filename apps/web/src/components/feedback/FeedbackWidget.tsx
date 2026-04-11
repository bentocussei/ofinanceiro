"use client"

import { MessageSquare, Star, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { feedbackApi, type FeedbackType } from "@/lib/api/feedback"

type Tab = "rating" | "suggestion" | "complaint"

const TABS: { id: Tab; label: string }[] = [
  { id: "rating", label: "Avaliar" },
  { id: "suggestion", label: "Sugestao" },
  { id: "complaint", label: "Reclamacao" },
]

function StarRating({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  const [hover, setHover] = useState(0)
  const active = hover || value

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
          aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
        >
          <Star
            className={`h-6 w-6 transition-colors ${
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

export function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>("rating")
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState("")
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [submitting, setSubmitting] = useState(false)

  function handleOpen() {
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
    // Reset form after close animation
    setTimeout(() => {
      setTab("rating")
      setRating(0)
      setMessage("")
      setContactName("")
      setContactEmail("")
      setContactPhone("")
    }, 200)
  }

  async function handleSubmit() {
    if (tab === "rating" && rating === 0) {
      toast.error("Por favor seleccione uma avaliacao")
      return
    }
    if ((tab === "suggestion" || tab === "complaint") && !message.trim()) {
      toast.error("Por favor escreva a sua mensagem")
      return
    }

    setSubmitting(true)
    try {
      const typeMap: Record<Tab, FeedbackType> = {
        rating: "rating",
        suggestion: "suggestion",
        complaint: "complaint",
      }
      await feedbackApi.submit({
        type: typeMap[tab],
        rating: tab === "rating" ? rating : undefined,
        message: message.trim() || undefined,
        contact_name: contactName.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
      })
      toast.success(
        tab === "rating"
          ? "Avaliacao enviada. Obrigado!"
          : tab === "suggestion"
          ? "Sugestao recebida. Obrigado!"
          : "Reclamacao registada. Vamos analisar."
      )
      handleClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar"
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_4px_16px_rgba(0,0,0,0.18)] hover:bg-primary/90 transition-all hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label="Feedback"
      >
        <MessageSquare className="h-5 w-5" />
      </button>

      {/* Panel */}
      {open && (
        <>
          {/* Backdrop (mobile) */}
          <div
            className="fixed inset-0 z-50 bg-black/40 sm:hidden"
            onClick={handleClose}
          />

          <div className="fixed bottom-20 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-xl bg-card border border-border shadow-[0_8px_40px_rgba(0,0,0,0.18)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">Feedback</h3>
              <button
                onClick={handleClose}
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                    tab === t.id
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              {tab === "rating" && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs">Como avalia a aplicacao?</Label>
                    <StarRating value={rating} onChange={setRating} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="fw-msg-rating" className="text-xs">
                      Comentario (opcional)
                    </Label>
                    <textarea
                      id="fw-msg-rating"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Conte-nos mais..."
                      rows={3}
                      className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
                    />
                  </div>
                </>
              )}

              {(tab === "suggestion" || tab === "complaint") && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="fw-msg-text" className="text-xs">
                      {tab === "suggestion" ? "Descreva a sua sugestao" : "Descreva o problema"}
                    </Label>
                    <textarea
                      id="fw-msg-text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={
                        tab === "suggestion"
                          ? "Tenho uma ideia para melhorar..."
                          : "Encontrei um problema em..."
                      }
                      rows={4}
                      className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
                    />
                  </div>
                </>
              )}

              <Button
                className="w-full h-9"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "A enviar..." : "Enviar"}
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
