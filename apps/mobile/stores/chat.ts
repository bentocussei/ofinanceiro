import { create } from 'zustand'

import { getTokens } from '../lib/api'
import { getContextHeader } from '../lib/context'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'

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
  progressMessage: string | null
  sendMessage: (text: string) => Promise<void>
  clearChat: () => void
}

let messageCounter = 0

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  sessionId: null,
  isLoading: false,
  progressMessage: null,

  sendMessage: async (text: string) => {
    const state = get()
    const userMessage: ChatMessage = {
      id: `msg-${++messageCounter}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }

    const assistantId = `msg-${++messageCounter}`

    // Add user message + empty assistant placeholder
    set({
      messages: [
        ...state.messages,
        userMessage,
        { id: assistantId, role: 'assistant', content: '', timestamp: new Date().toISOString() },
      ],
      isLoading: true,
    })

    try {
      const history = state.messages.slice(-20).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const { access } = await getTokens()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Context': getContextHeader(),
      }
      if (access) headers['Authorization'] = `Bearer ${access}`

      const res = await fetch(`${API_URL}/api/v1/chat/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: text,
          session_id: state.sessionId,
          conversation_history: history,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: { message: 'Erro ao processar' } }))
        throw new Error(err.detail?.message || 'Erro ao processar mensagem')
      }

      // React Native on iOS doesn't support streaming ReadableStream well.
      // Read full response as text then parse SSE events.
      const rawText = await res.text()
      let fullContent = ''
      let agent = ''
      let newSessionId = state.sessionId

      // Try to parse as SSE lines
      const lines = rawText.split('\n')
      let parsedAnyEvent = false

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (!payload || payload === '[DONE]' || payload === 'done') continue
        try {
          const event = JSON.parse(payload)
          parsedAnyEvent = true
          if (event.type === 'progress') {
            set({ progressMessage: event.content })
          } else if (event.type === 'result') {
            fullContent = event.content
            agent = event.agent
            newSessionId = event.session_id
          } else if (event.type === 'error') {
            fullContent = event.content || 'Erro ao processar'
          }
        } catch { /* skip malformed lines */ }
      }

      // Fallback: if no SSE events parsed, try as plain JSON
      if (!parsedAnyEvent) {
        try {
          const data = JSON.parse(rawText)
          fullContent = data.content || data.message || rawText
          agent = data.agent || ''
          newSessionId = data.session_id || newSessionId
        } catch {
          fullContent = rawText || 'Resposta recebida'
        }
      }

      updateAssistant(assistantId, fullContent, agent, newSessionId)
      set({ sessionId: newSessionId, isLoading: false, progressMessage: null })
    } catch (error: any) {
      // Update the placeholder with error
      const msgs = get().messages.map((m) =>
        m.id === assistantId
          ? { ...m, content: error.message || 'Desculpe, ocorreu um erro. Tente novamente.', agent: 'system' }
          : m
      )
      set({ messages: msgs, isLoading: false, progressMessage: null })
    }
  },

  clearChat: () => set({ messages: [], sessionId: null, progressMessage: null }),
}))

// Helper to update assistant message content during streaming
function updateAssistantContent(id: string, content: string) {
  const { messages } = useChatStore.getState()
  useChatStore.setState({
    messages: messages.map((m) => (m.id === id ? { ...m, content } : m)),
  })
}

// Helper to finalize assistant message
function updateAssistant(id: string, content: string, agent?: string, sessionId?: string | null) {
  const { messages } = useChatStore.getState()
  useChatStore.setState({
    messages: messages.map((m) =>
      m.id === id ? { ...m, content, agent: agent || m.agent } : m
    ),
    ...(sessionId ? { sessionId } : {}),
  })
}
