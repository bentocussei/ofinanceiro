import { create } from 'zustand'

import { apiFetch } from '../lib/api'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  agent?: string
  timestamp: string
  needs_confirmation?: boolean
  confirmation_data?: Record<string, unknown>
}

interface ChatState {
  messages: ChatMessage[]
  sessionId: string | null
  isLoading: boolean
  sendMessage: (text: string) => Promise<void>
  clearChat: () => void
}

let messageCounter = 0

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  sessionId: null,
  isLoading: false,

  sendMessage: async (text: string) => {
    const state = get()
    const userMessage: ChatMessage = {
      id: `msg-${++messageCounter}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }

    set({ messages: [...state.messages, userMessage], isLoading: true })

    try {
      const history = state.messages.slice(-20).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const response = await apiFetch<{
        content: string
        agent: string
        session_id: string
        needs_confirmation: boolean
        confirmation_data: Record<string, unknown> | null
      }>('/api/v1/chat/message', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          session_id: state.sessionId,
          conversation_history: history,
        }),
      })

      const assistantMessage: ChatMessage = {
        id: `msg-${++messageCounter}`,
        role: 'assistant',
        content: response.content,
        agent: response.agent,
        timestamp: new Date().toISOString(),
        needs_confirmation: response.needs_confirmation,
        confirmation_data: response.confirmation_data ?? undefined,
      }

      set({
        messages: [...get().messages, assistantMessage],
        sessionId: response.session_id,
        isLoading: false,
      })
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: `msg-${++messageCounter}`,
        role: 'assistant',
        content: error.message || 'Desculpe, ocorreu um erro. Tente novamente.',
        agent: 'system',
        timestamp: new Date().toISOString(),
      }

      set({ messages: [...get().messages, errorMessage], isLoading: false })
    }
  },

  clearChat: () => set({ messages: [], sessionId: null }),
}))
