import { Ionicons } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import * as Haptics from 'expo-haptics'
import { useCallback, useRef, useState } from 'react'
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native'
import Markdown from 'react-native-markdown-display'
import { SafeAreaView } from 'react-native-safe-area-context'

import { getTokens } from '../../lib/api'
import { getContextHeader } from '../../lib/context'
import { ChatMessage, useChatStore } from '../../stores/chat'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'

const QUICK_ACTIONS = [
  { label: 'Quanto tenho?', iconName: 'cash-outline' as const },
  { label: 'Ultimas transaccoes', iconName: 'document-text-outline' as const },
  { label: 'Gastos deste mes', iconName: 'bar-chart-outline' as const },
]

export default function ChatScreen() {
  const isDark = useColorScheme() === 'dark'
  const [input, setInput] = useState('')
  const flatListRef = useRef<FlatList>(null)
  const { messages, isLoading, sendMessage, clearChat } = useChatStore()
  const [uploading, setUploading] = useState(false)

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return

    setInput('')
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    await sendMessage(text)

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true })
    }, 100)
  }, [input, isLoading, sendMessage])

  const handleQuickAction = useCallback(
    (text: string) => {
      setInput('')
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      sendMessage(text).then(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      })
    },
    [sendMessage]
  )

  const handleFileUpload = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        copyToCacheDirectory: true,
      })

      if (result.canceled || !result.assets?.[0]) return

      const file = result.assets[0]
      setUploading(true)

      const { access } = await getTokens()
      const formData = new FormData()
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      } as any)
      if (input.trim()) formData.append('message', input.trim())

      const sessionId = useChatStore.getState().sessionId
      if (sessionId) formData.append('session_id', sessionId)

      const headers: Record<string, string> = {
        'X-Context': getContextHeader(),
      }
      if (access) headers['Authorization'] = `Bearer ${access}`

      // Add user message
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: `[Ficheiro: ${file.name}]${input.trim() ? `\n${input.trim()}` : ''}`,
        timestamp: new Date().toISOString(),
      }
      useChatStore.setState((s) => ({
        messages: [...s.messages, userMsg],
        isLoading: true,
      }))
      setInput('')

      const res = await fetch(`${API_URL}/api/v1/chat/upload`, {
        method: 'POST',
        headers,
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: { message: 'Erro ao enviar ficheiro' } }))
        throw new Error(err.detail?.message || 'Erro ao enviar ficheiro')
      }

      const data = await res.json()
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.content,
        agent: data.agent,
        timestamp: new Date().toISOString(),
      }
      useChatStore.setState((s) => ({
        messages: [...s.messages, assistantMsg],
        sessionId: data.session_id || s.sessionId,
        isLoading: false,
      }))

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao enviar ficheiro')
      useChatStore.setState({ isLoading: false })
    } finally {
      setUploading(false)
    }
  }, [input])

  const mdStyles = isDark ? darkMdStyles : lightMdStyles

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user'
    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : (isDark ? styles.assistantBubbleDark : styles.assistantBubble)]}>
        {!isUser && item.agent && (
          <Text style={styles.agentLabel}>{item.agent}</Text>
        )}
        {isUser ? (
          <Text style={styles.userText}>{item.content}</Text>
        ) : (
          <Markdown style={mdStyles}>{item.content || ' '}</Markdown>
        )}
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, isDark && styles.textLight]}>Assistente</Text>
          {messages.length > 0 && (
            <Pressable onPress={clearChat} style={styles.clearBtn}>
              <Ionicons name="trash-outline" size={18} color={isDark ? '#999' : '#666'} />
            </Pressable>
          )}
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color={isDark ? '#666' : '#ccc'} />
              <Text style={[styles.emptyTitle, isDark && styles.textLight]}>
                Ola! Sou o teu assistente financeiro.
              </Text>
              <Text style={[styles.emptySubtitle, isDark && styles.textMuted]}>
                Podes dizer-me quanto gastaste, perguntar o teu saldo, ou pedir conselhos.
              </Text>

              {/* Quick Actions */}
              <View style={styles.quickActions}>
                {QUICK_ACTIONS.map((action) => (
                  <Pressable
                    key={action.label}
                    style={[styles.quickAction, isDark && styles.quickActionDark]}
                    onPress={() => handleQuickAction(action.label)}
                  >
                    <Ionicons name={action.iconName} size={18} color={isDark ? '#999' : '#666'} />
                    <Text style={[styles.quickActionText, isDark && styles.textMuted]}>
                      {action.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          }
        />

        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>A pensar...</Text>
          </View>
        )}

        {/* Input */}
        <View style={[styles.inputContainer, isDark && styles.inputContainerDark]}>
          <Pressable
            style={styles.attachBtn}
            onPress={handleFileUpload}
            disabled={uploading || isLoading}
          >
            <Ionicons
              name="attach-outline"
              size={22}
              color={uploading ? '#999' : (isDark ? '#999' : '#666')}
            />
          </Pressable>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="Escreve uma mensagem..."
            placeholderTextColor="#999"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            multiline
            maxLength={2000}
            editable={!isLoading}
          />
          <Pressable
            style={[styles.sendBtn, (!input.trim() || isLoading) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || isLoading}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// Markdown styles
const lightMdStyles = StyleSheet.create({
  body: { fontSize: 15, lineHeight: 22, color: '#000' },
  heading1: { fontSize: 18, fontWeight: '700' as const, marginBottom: 4 },
  heading2: { fontSize: 16, fontWeight: '700' as const, marginBottom: 4 },
  heading3: { fontSize: 15, fontWeight: '600' as const, marginBottom: 4 },
  paragraph: { marginBottom: 8 },
  strong: { fontWeight: '700' as const },
  bullet_list: { marginBottom: 8 },
  ordered_list: { marginBottom: 8 },
  list_item: { marginBottom: 4 },
  code_inline: { backgroundColor: '#f0f0f0', paddingHorizontal: 4, borderRadius: 4, fontFamily: 'monospace', fontSize: 13 },
  fence: { backgroundColor: '#f0f0f0', padding: 10, borderRadius: 8, fontFamily: 'monospace', fontSize: 13 },
  table: { borderWidth: 1, borderColor: '#e5e5e5' },
  thead: { backgroundColor: '#f5f5f5' },
  th: { padding: 6, fontWeight: '600' as const },
  td: { padding: 6 },
  tr: { borderBottomWidth: 0.5, borderColor: '#e5e5e5' },
})

const darkMdStyles = StyleSheet.create({
  body: { fontSize: 15, lineHeight: 22, color: '#fff' },
  heading1: { fontSize: 18, fontWeight: '700' as const, color: '#fff', marginBottom: 4 },
  heading2: { fontSize: 16, fontWeight: '700' as const, color: '#fff', marginBottom: 4 },
  heading3: { fontSize: 15, fontWeight: '600' as const, color: '#fff', marginBottom: 4 },
  paragraph: { marginBottom: 8, color: '#fff' },
  strong: { fontWeight: '700' as const, color: '#fff' },
  bullet_list: { marginBottom: 8 },
  ordered_list: { marginBottom: 8 },
  list_item: { marginBottom: 4, color: '#eee' },
  code_inline: { backgroundColor: '#333', color: '#e5e5e5', paddingHorizontal: 4, borderRadius: 4, fontFamily: 'monospace', fontSize: 13 },
  fence: { backgroundColor: '#222', color: '#e5e5e5', padding: 10, borderRadius: 8, fontFamily: 'monospace', fontSize: 13 },
  table: { borderWidth: 1, borderColor: '#444' },
  thead: { backgroundColor: '#333' },
  th: { padding: 6, fontWeight: '600' as const, color: '#fff' },
  td: { padding: 6, color: '#eee' },
  tr: { borderBottomWidth: 0.5, borderColor: '#444' },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  containerDark: { backgroundColor: '#000' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#000' },
  clearBtn: { padding: 8 },
  messageList: { paddingHorizontal: 16, paddingBottom: 8, flexGrow: 1 },
  messageBubble: { maxWidth: '85%', marginVertical: 4, padding: 12, borderRadius: 16 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#000', borderBottomRightRadius: 4 },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  assistantBubbleDark: { alignSelf: 'flex-start', backgroundColor: '#1a1a1a', borderBottomLeftRadius: 4 },
  agentLabel: { fontSize: 10, color: '#3b82f6', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  userText: { fontSize: 15, lineHeight: 22, color: '#fff' },
  typingIndicator: { paddingHorizontal: 20, paddingVertical: 6 },
  typingText: { fontSize: 13, color: '#999', fontStyle: 'italic' },
  inputContainer: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 8, paddingVertical: 8,
    borderTopWidth: 0.5, borderTopColor: '#e5e5e5', backgroundColor: '#fff',
  },
  inputContainerDark: { borderTopColor: '#333', backgroundColor: '#1a1a1a' },
  attachBtn: { padding: 10 },
  input: {
    flex: 1, fontSize: 16, paddingHorizontal: 12, paddingVertical: 10, maxHeight: 100,
    backgroundColor: '#f5f5f5', borderRadius: 20, color: '#000',
  },
  inputDark: { backgroundColor: '#222', color: '#fff' },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#000',
    alignItems: 'center', justifyContent: 'center', marginLeft: 4,
  },
  sendBtnDisabled: { opacity: 0.3 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#000', textAlign: 'center', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20 },
  quickActions: { marginTop: 24, gap: 8, width: '100%' },
  quickAction: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e5e5',
  },
  quickActionDark: { backgroundColor: '#1a1a1a', borderColor: '#333' },
  quickActionText: { fontSize: 14, color: '#666' },
  textLight: { color: '#fff' },
  textMuted: { color: '#999' },
})
