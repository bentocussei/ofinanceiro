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

export const chatApi = {
  send: (data: SendMessageData) =>
    apiFetch<ChatResponse>("/api/v1/chat/message", {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        ...getContextHeader(),
      },
    }),
}
