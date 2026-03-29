import { apiFetch } from "./client"

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

type H = { headers?: Record<string, string> }

export const chatApi = {
  send: (data: SendMessageData, opts?: H) =>
    apiFetch<ChatResponse>("/api/v1/chat/message", {
      method: "POST",
      body: JSON.stringify(data),
      ...opts,
    }),
}
