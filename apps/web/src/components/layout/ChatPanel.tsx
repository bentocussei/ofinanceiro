"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Banknote, BarChart3, Bot, ClipboardList, MessageCircle } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  agent?: string
}

const QUICK_ACTIONS = [
  { label: "Quanto tenho?", Icon: Banknote },
  { label: "Ultimas transaccoes", Icon: ClipboardList },
  { label: "Gastos deste mes", Icon: BarChart3 },
]

export function ChatPanel() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageCounter = useRef(0)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return

      const userMsg: ChatMessage = {
        id: `msg-${++messageCounter.current}`,
        role: "user",
        content: text,
      }
      setMessages((prev) => [...prev, userMsg])
      setInput("")
      setIsLoading(true)

      try {
        const history = messages.slice(-20).map((m) => ({
          role: m.role,
          content: m.content,
        }))

        const response = await apiFetch<{
          content: string
          agent: string
          session_id: string
        }>("/api/v1/chat/message", {
          method: "POST",
          body: JSON.stringify({
            message: text,
            session_id: sessionId,
            conversation_history: history,
          }),
        })

        const assistantMsg: ChatMessage = {
          id: `msg-${++messageCounter.current}`,
          role: "assistant",
          content: response.content,
          agent: response.agent,
        }

        setMessages((prev) => [...prev, assistantMsg])
        setSessionId(response.session_id)
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Erro ao processar mensagem"
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${++messageCounter.current}`,
            role: "assistant",
            content: errorMessage,
            agent: "system",
          },
        ])
      } finally {
        setIsLoading(false)
      }
    },
    [messages, sessionId, isLoading]
  )

  return (
    <>
      {/* Floating chat button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-200 hover:scale-105 animate-pulse-subtle"
          title="Abrir assistente"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[400px] flex flex-col p-0">
          <SheetHeader className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-sm font-semibold">Assistente</SheetTitle>
                <SheetDescription className="text-xs">
                  Pergunte-me qualquer coisa
                </SheetDescription>
              </div>
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMessages([])
                    setSessionId(null)
                  }}
                >
                  Limpar
                </Button>
              )}
            </div>
          </SheetHeader>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center pt-8 gap-3">
                <Bot className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-center text-muted-foreground">
                  Ola! Sou o teu assistente financeiro.
                </p>
                <div className="w-full space-y-2 mt-4">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-lg border border-border hover:bg-accent transition-colors"
                      onClick={() => sendMessage(action.label)}
                    >
                      <action.Icon className="h-4 w-4" />
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`max-w-[90%] ${msg.role === "user" ? "ml-auto" : "mr-auto"}`}
                >
                  {msg.role === "assistant" && msg.agent && (
                    <span className="text-[10px] font-semibold text-primary uppercase mb-0.5 block">
                      {msg.agent}
                    </span>
                  )}
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-foreground text-background rounded-br-sm"
                        : "bg-muted rounded-bl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="text-xs text-muted-foreground italic">A pensar...</div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                sendMessage(input)
              }}
            >
              <Input
                placeholder="Escreve uma mensagem..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="text-sm"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!input.trim() || isLoading}
              >
                Enviar
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
