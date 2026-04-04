"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { toast } from "sonner"

import {
  ArrowUp,
  Bot,
  MessageSquarePlus,
  Paperclip,
} from "lucide-react"
import { chatApi } from "@/lib/api/chat"
import { InlineChart, type ChartConfig } from "@/components/assistant/InlineChart"
import { MetricCards, type MetricConfig } from "@/components/assistant/MetricCards"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  agent?: string
  timestamp: number
}

// ---------------------------------------------------------------------------
// Quick actions
// ---------------------------------------------------------------------------

const PERSONAL_QUICK_ACTIONS = [
  { label: "Quanto tenho de saldo?", category: "Contas" },
  { label: "Quanto gastei este mes?", category: "Despesas" },
  { label: "Como esta o meu orcamento?", category: "Orcamento" },
  { label: "Qual o estado das minhas metas?", category: "Metas" },
  { label: "Resumo das minhas dividas", category: "Dividas" },
  { label: "Como estao os meus investimentos?", category: "Investimentos" },
]

const FAMILY_QUICK_ACTIONS = [
  { label: "Quanto temos de saldo familiar?", category: "Contas" },
  { label: "Quanto gastamos este mes?", category: "Despesas" },
  { label: "Como esta o orcamento familiar?", category: "Orcamento" },
  { label: "Qual o estado das metas da familia?", category: "Metas" },
  { label: "Resumo das dividas familiares", category: "Dividas" },
  { label: "Quem gastou mais este mes?", category: "Membros" },
]

// ---------------------------------------------------------------------------
// Markdown components
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Parse chart/metrics JSON safely
// ---------------------------------------------------------------------------

function tryParseChart(raw: string): ChartConfig | null {
  try {
    const obj = JSON.parse(raw)
    if (obj && obj.type && Array.isArray(obj.labels) && Array.isArray(obj.values)) {
      return obj as ChartConfig
    }
  } catch { /* not valid JSON */ }
  return null
}

function tryParseMetrics(raw: string): MetricConfig[] | null {
  try {
    const arr = JSON.parse(raw)
    if (Array.isArray(arr) && arr.length > 0 && arr[0].label !== undefined && arr[0].value !== undefined) {
      return arr as MetricConfig[]
    }
  } catch { /* not valid JSON */ }
  return null
}

// ---------------------------------------------------------------------------
// Markdown components factory — accepts sendPrompt for chart interactivity
// (mirrors Visualizer's sendPrompt global function)
// ---------------------------------------------------------------------------

function createMarkdownComponents(onSendPrompt?: (text: string) => void) {
  return {
    p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
    ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
    ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
    li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
    strong: ({ children }: { children?: React.ReactNode }) => <strong style={{ fontWeight: 500 }}>{children}</strong>,
    h1: ({ children }: { children?: React.ReactNode }) => <h3 style={{ fontSize: 18, fontWeight: 500 }} className="mb-2 mt-3">{children}</h3>,
    h2: ({ children }: { children?: React.ReactNode }) => <h3 style={{ fontSize: 16, fontWeight: 500 }} className="mb-2 mt-3">{children}</h3>,
    h3: ({ children }: { children?: React.ReactNode }) => <h4 style={{ fontSize: 14, fontWeight: 500 }} className="mb-1.5 mt-2">{children}</h4>,
    pre: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
      const raw = String(children).trim()
      const lang = className?.replace("language-", "") || ""

      if (lang === "chart") {
        const config = tryParseChart(raw)
        if (config) return <InlineChart config={config} onSendPrompt={onSendPrompt} />
      }

      if (lang === "metrics") {
        const metrics = tryParseMetrics(raw)
        if (metrics) return <MetricCards metrics={metrics} />
      }

      return <code className="bg-muted/50 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
    },
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">
        {children}
      </a>
    ),
    hr: () => <hr className="my-3 border-border/40" />,
    table: ({ children }: { children?: React.ReactNode }) => (
      <div className="overflow-x-auto my-2">
        <table className="w-full text-sm border-collapse">{children}</table>
      </div>
    ),
    thead: ({ children }: { children?: React.ReactNode }) => <thead className="border-b border-border/50">{children}</thead>,
    tbody: ({ children }: { children?: React.ReactNode }) => <tbody>{children}</tbody>,
    tr: ({ children }: { children?: React.ReactNode }) => <tr className="border-b border-border/20">{children}</tr>,
    th: ({ children }: { children?: React.ReactNode }) => (
      <th className="text-left py-1.5 px-2 text-xs text-muted-foreground" style={{ fontWeight: 500 }}>{children}</th>
    ),
    td: ({ children }: { children?: React.ReactNode }) => <td className="py-1.5 px-2 font-mono text-xs">{children}</td>,
  }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface AssistantChatProps {
  context: "personal" | "family"
}

export function AssistantChat({ context }: AssistantChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [progressMsg, setProgressMsg] = useState("")
  const [sessionId, setSessionId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messageCounter = useRef(0)

  const quickActions = context === "family" ? FAMILY_QUICK_ACTIONS : PERSONAL_QUICK_ACTIONS

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Send text message
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return

      const userMsg: ChatMessage = {
        id: `msg-${++messageCounter.current}`,
        role: "user",
        content: text,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, userMsg])
      setInput("")
      setIsLoading(true)
      setProgressMsg("")

      const history = messages.slice(-20).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        ...(m.agent ? { agent: m.agent } : {}),
      }))

      await chatApi.sendStream(
        {
          message: text,
          session_id: sessionId ?? undefined,
          conversation_history: history,
        },
        // onProgress — real-time feedback from backend
        (msg) => setProgressMsg(msg),
        // onResult — final response
        (response) => {
          const assistantMsg: ChatMessage = {
            id: `msg-${++messageCounter.current}`,
            role: "assistant",
            content: response.content,
            agent: response.agent,
            timestamp: Date.now(),
          }
          setMessages((prev) => [...prev, assistantMsg])
          setSessionId(response.session_id)
          setIsLoading(false)
          setProgressMsg("")
          inputRef.current?.focus()

          // Sonner for operations
          if (
            response.content.includes("registad") ||
            response.content.includes("criad") ||
            response.content.includes("Registei") ||
            response.content.includes("com sucesso")
          ) {
            toast.success("Operação realizada com sucesso")
          }
          if (response.content.includes("eliminad") || response.content.includes("removid") || response.content.includes("cancelad")) {
            toast.info("Operação concluída")
          }
        },
        // onError
        (errorMessage) => {
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-${++messageCounter.current}`,
              role: "assistant",
              content: errorMessage,
              agent: "system",
              timestamp: Date.now(),
            },
          ])
          setIsLoading(false)
          setProgressMsg("")
          inputRef.current?.focus()
        },
      )
    },
    [messages, sessionId, isLoading],
  )

  // Memoized markdown components — passes sendMessage as sendPrompt for chart interactivity
  const markdownComponents = useMemo(() => createMarkdownComponents(sendMessage), [sendMessage])

  // Send file
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file || isLoading) return

      const userMsg: ChatMessage = {
        id: `msg-${++messageCounter.current}`,
        role: "user",
        content: `[Ficheiro: ${file.name}]`,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, userMsg])
      setIsLoading(true)

      try {
        const response = await chatApi.sendFile(file, "", sessionId ?? undefined)
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${++messageCounter.current}`,
            role: "assistant",
            content: response.content,
            agent: response.agent,
            timestamp: Date.now(),
          },
        ])
        setSessionId(response.session_id)
      } catch (error: unknown) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${++messageCounter.current}`,
            role: "assistant",
            content: error instanceof Error ? error.message : "Erro ao processar ficheiro",
            agent: "system",
            timestamp: Date.now(),
          },
        ])
      } finally {
        setIsLoading(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    },
    [sessionId, isLoading],
  )

  // New conversation
  const handleNewConversation = () => {
    setMessages([])
    setSessionId(null)
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-xl font-semibold mb-1">
              {context === "family" ? "Assistente Familiar" : "Assistente Financeiro"}
            </h1>
            <p className="text-sm text-muted-foreground mb-8 text-center max-w-md">
              {context === "family"
                ? "Pergunte qualquer coisa sobre as financas da sua familia. Posso consultar saldos partilhados, registar transaccoes e analisar gastos familiares."
                : "Pergunte qualquer coisa sobre as suas financas. Posso consultar saldos, registar transaccoes, analisar gastos e muito mais."}
            </p>

            <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => sendMessage(action.label)}
                  className="flex flex-col items-start gap-1 rounded-xl border border-border p-3 text-left text-sm hover:bg-accent transition-colors"
                >
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    {action.category}
                  </span>
                  <span className="text-foreground">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages */
          <div className="px-4 py-6 space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className="max-w-3xl mx-auto">
                {msg.role === "user" ? (
                  /* User message */
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-2.5 text-sm">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  /* Assistant message */
                  <div className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {msg.agent && msg.agent !== "system" && (
                        <span className="text-[10px] font-medium text-primary/70 uppercase tracking-wider mb-1 block">
                          financeiro
                        </span>
                      )}
                      <div className="text-sm text-foreground leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="max-w-3xl mx-auto flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col gap-1 py-2">
                  {progressMsg && (
                    <span className="text-xs text-muted-foreground italic">
                      {progressMsg}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-background px-4 py-3">
        <div className="max-w-3xl mx-auto">
          {messages.length > 0 && (
            <div className="flex justify-center mb-2">
              <button
                onClick={handleNewConversation}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageSquarePlus className="h-3.5 w-3.5" />
                Nova conversa
              </button>
            </div>
          )}

          <form
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all"
            onSubmit={(e) => {
              e.preventDefault()
              sendMessage(input)
            }}
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
              title="Enviar foto ou ficheiro"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileUpload}
            />
            <input
              ref={inputRef}
              type="text"
              placeholder={
                context === "family"
                  ? "Pergunte qualquer coisa sobre as financas da familia..."
                  : "Pergunte qualquer coisa sobre as suas financas..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-30 transition-opacity"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </form>

          <p className="text-[10px] text-muted-foreground/50 text-center mt-2">
            O assistente pode cometer erros. Verifique sempre os valores.
          </p>
        </div>
      </div>
    </div>
  )
}
