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
