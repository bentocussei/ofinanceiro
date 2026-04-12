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

      const reader = res.body?.getReader()
      if (!reader) {
        // Fallback: read entire body as JSON (non-streaming endpoint)
        const data = await res.json()
        updateAssistant(assistantId, data.content, data.agent, data.session_id)
        set({ isLoading: false })
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''
      let agent = ''
      let newSessionId = state.sessionId

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'progress') {
              fullContent = event.content
              // Update assistant message progressively
              updateAssistantContent(assistantId, fullContent)
            } else if (event.type === 'result') {
              fullContent = event.content
              agent = event.agent
              newSessionId = event.session_id
              updateAssistant(assistantId, fullContent, agent, newSessionId)
            } else if (event.type === 'error') {
              updateAssistantContent(assistantId, event.content || 'Erro ao processar')
            }
          } catch { /* skip malformed SSE lines */ }
        }
      }

      set({ sessionId: newSessionId, isLoading: false })
    } catch (error: any) {
      // Update the placeholder with error
      const msgs = get().messages.map((m) =>
        m.id === assistantId
          ? { ...m, content: error.message || 'Desculpe, ocorreu um erro. Tente novamente.', agent: 'system' }
          : m
      )
      set({ messages: msgs, isLoading: false })
    }
  },

  clearChat: () => set({ messages: [], sessionId: null }),
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
