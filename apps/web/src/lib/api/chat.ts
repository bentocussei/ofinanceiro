import { apiFetch } from "./client"
import { getContextHeader } from "@/lib/context"

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface ChatResponse {
  content: string
  agent: string
  session_id: string
}

export interface SendMessageData {
  message: string
  session_id?: string
  conversation_history?: ChatMessage[]
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export const chatApi = {
  send: (data: SendMessageData) =>
    apiFetch<ChatResponse>("/api/v1/chat/message", {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        ...getContextHeader(),
      },
    }),

  sendStream: async (
    data: SendMessageData,
    onProgress: (msg: string) => void,
    onResult: (response: ChatResponse) => void,
    onError: (error: string) => void,
  ): Promise<void> => {
    const token = localStorage.getItem("access_token")
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...getContextHeader(),
    }
    if (token) headers["Authorization"] = `Bearer ${token}`

    const res = await fetch(`${API_URL}/api/v1/chat/stream`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: { message: "Erro ao processar" } }))
      if (res.status === 429) {
        onError(err.detail?.message || "Limite diário atingido.")
      } else {
        onError(err.detail?.message || "Erro ao processar mensagem")
      }
      return
    }

    const reader = res.body?.getReader()
    if (!reader) { onError("Stream não disponível"); return }

    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue
        try {
          const event = JSON.parse(line.slice(6))
          if (event.type === "progress") {
            onProgress(event.content)
          } else if (event.type === "result") {
            onResult({
              content: event.content,
              agent: event.agent,
              session_id: event.session_id,
            })
          } else if (event.type === "error") {
            onError(event.content)
          }
        } catch { /* skip malformed lines */ }
      }
    }
  },

  sendFile: async (file: File, message?: string, sessionId?: string): Promise<ChatResponse> => {
    const token = localStorage.getItem("access_token")
    const formData = new FormData()
    formData.append("file", file)
    if (message) formData.append("message", message)
    if (sessionId) formData.append("session_id", sessionId)

    const headers: Record<string, string> = { ...getContextHeader() }
    if (token) headers["Authorization"] = `Bearer ${token}`

    const res = await fetch(`${API_URL}/api/v1/chat/upload`, {
      method: "POST",
      headers,
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: { message: "Erro ao enviar ficheiro" } }))
      throw new Error(err.detail?.message || "Erro ao enviar ficheiro")
    }
    return res.json()
  },
}
