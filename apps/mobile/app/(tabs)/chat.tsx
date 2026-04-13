import { Ionicons } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import * as Haptics from 'expo-haptics'
import * as ImagePicker from 'expo-image-picker'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ActionSheetIOS } from 'react-native'
import {
  Alert,
  Animated,
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

import InlineChart, { InlineChartProps } from '../../components/assistant/InlineChart'
import MetricCards, { MetricConfig } from '../../components/assistant/MetricCards'
import VoiceRecorder from '../../components/assistant/VoiceRecorder'
import ContextSwitcher from '../../components/common/ContextSwitcher'
import { getTokens } from '../../lib/api'
import { getContextHeader, isFamilyContext } from '../../lib/context'
import { colors, themeColors } from '../../lib/tokens'
import { ChatMessage, useChatStore } from '../../stores/chat'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'

// --- Rich data visualization helpers ---

/** Try to parse a JSON string, returning null on failure. */
function tryParseJSON(text: string): unknown | null {
  try {
    return JSON.parse(text.trim())
  } catch {
    return null
  }
}

/** Check if an array looks like MetricConfig[] data. */
function isMetricArray(data: unknown): data is MetricConfig[] {
  if (!Array.isArray(data) || data.length === 0) return false
  return data.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      'label' in item &&
      'value' in item &&
      typeof (item as MetricConfig).label === 'string' &&
      typeof (item as MetricConfig).value === 'number'
  )
}

/** Check if an object looks like InlineChartProps. */
function isChartConfig(data: unknown): data is InlineChartProps {
  if (typeof data !== 'object' || data === null) return false
  const obj = data as Record<string, unknown>
  return (
    typeof obj.type === 'string' &&
    Array.isArray(obj.labels) &&
    Array.isArray(obj.values)
  )
}

/**
 * Split assistant content into segments: regular markdown text and
 * rich blocks (metrics/chart code fences, or leading JSON arrays).
 */
interface ContentSegment {
  type: 'markdown' | 'metrics' | 'chart'
  content: string
  parsed?: MetricConfig[] | InlineChartProps
}

function parseAssistantContent(content: string): ContentSegment[] {
  const segments: ContentSegment[] = []

  // Match ```metrics ... ``` or ```chart ... ``` code fences
  const fenceRegex = /```(metrics|chart)\s*\n([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = fenceRegex.exec(content)) !== null) {
    // Text before this fence
    if (match.index > lastIndex) {
      const before = content.slice(lastIndex, match.index).trim()
      if (before) segments.push({ type: 'markdown', content: before })
    }

    const lang = match[1] as 'metrics' | 'chart'
    const body = match[2]
    const parsed = tryParseJSON(body)

    if (lang === 'metrics' && isMetricArray(parsed)) {
      segments.push({ type: 'metrics', content: body, parsed })
    } else if (lang === 'chart' && isChartConfig(parsed)) {
      segments.push({ type: 'chart', content: body, parsed })
    } else {
      // Parsing failed — render as regular code block
      segments.push({ type: 'markdown', content: '```\n' + body + '```' })
    }

    lastIndex = match.index + match[0].length
  }

  // Remaining text after last fence
  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex).trim()
    if (remaining) segments.push({ type: 'markdown', content: remaining })
  }

  // If no fences were found, check if the entire content starts with a JSON array
  // that looks like metric data
  if (segments.length === 1 && segments[0].type === 'markdown') {
    const text = segments[0].content
    const jsonArrayMatch = text.match(/^(\[[\s\S]*?\])([\s\S]*)/)
    if (jsonArrayMatch) {
      const parsed = tryParseJSON(jsonArrayMatch[1])
      if (isMetricArray(parsed)) {
        const result: ContentSegment[] = [
          { type: 'metrics', content: jsonArrayMatch[1], parsed },
        ]
        const rest = jsonArrayMatch[2].trim()
        if (rest) result.push({ type: 'markdown', content: rest })
        return result
      }
    }
  }

  return segments.length > 0 ? segments : [{ type: 'markdown', content }]
}

const PERSONAL_ACTIONS = [
  { category: 'Contas', label: 'Quanto tenho de saldo?' },
  { category: 'Despesas', label: 'Quanto gastei este mes?' },
  { category: 'Orcamento', label: 'Como esta o meu orcamento?' },
  { category: 'Metas', label: 'Qual o estado das minhas metas?' },
  { category: 'Dividas', label: 'Resumo das minhas dividas' },
  { category: 'Investimentos', label: 'Como estao os meus investimentos?' },
]

const FAMILY_ACTIONS = [
  { category: 'Contas', label: 'Quanto temos de saldo familiar?' },
  { category: 'Despesas', label: 'Quanto gastamos este mes?' },
  { category: 'Orcamento', label: 'Como esta o orcamento familiar?' },
  { category: 'Metas', label: 'Qual o estado das metas da familia?' },
  { category: 'Dividas', label: 'Resumo das dividas familiares' },
  { category: 'Membros', label: 'Quem gastou mais este mes?' },
]

// Animated bouncing dots component
function ThinkingDots({ isDark, progressMsg }: { isDark: boolean; progressMsg?: string | null }) {
  const dot1 = useRef(new Animated.Value(0)).current
  const dot2 = useRef(new Animated.Value(0)).current
  const dot3 = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const createBounce = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      )

    const anim1 = createBounce(dot1, 0)
    const anim2 = createBounce(dot2, 150)
    const anim3 = createBounce(dot3, 300)

    anim1.start()
    anim2.start()
    anim3.start()

    return () => {
      anim1.stop()
      anim2.stop()
      anim3.stop()
    }
  }, [dot1, dot2, dot3])

  const dotStyle = {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    opacity: 0.4,
    marginHorizontal: 2,
  }

  return (
    <View style={styles.thinkingRow}>
      <View style={styles.botAvatarSmall}>
        <Ionicons name="chatbubble-ellipses" size={16} color={colors.primary} />
      </View>
      <View>
        {progressMsg ? (
          <Text style={styles.progressText}>{progressMsg}</Text>
        ) : null}
        <View style={styles.thinkingDots}>
          <Animated.View style={[dotStyle, { transform: [{ translateY: dot1 }] }]} />
          <Animated.View style={[dotStyle, { transform: [{ translateY: dot2 }] }]} />
          <Animated.View style={[dotStyle, { transform: [{ translateY: dot3 }] }]} />
        </View>
      </View>
    </View>
  )
}

export default function ChatScreen() {
  const isDark = useColorScheme() === 'dark'
  const tc = themeColors(isDark)
  const [input, setInput] = useState('')
  const flatListRef = useRef<FlatList>(null)
  const { messages, isLoading, progressMessage, sendMessage, clearChat } = useChatStore()
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

  // Upload a file (image, pdf, csv) to the chat backend
  const uploadFile = useCallback(
    async (uri: string, name: string, mimeType: string) => {
      setUploading(true)

    try {
      const { access } = await getTokens()
      const formData = new FormData()
      formData.append('file', {
        uri,
        name,
        type: mimeType,
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
        content: `[Ficheiro: ${name}]${input.trim() ? `\n${input.trim()}` : ''}`,
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

  // Take photo with camera
  const handleTakePhoto = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permissao necessaria', 'Precisamos de acesso a camara.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    })
    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    const name = asset.fileName || `photo-${Date.now()}.jpg`
    await uploadFile(asset.uri, name, asset.mimeType || 'image/jpeg')
  }, [uploadFile])

  // Pick image from gallery
  const handlePickImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permissao necessaria', 'Precisamos de acesso a galeria.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    })
    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    const name = asset.fileName || `image-${Date.now()}.jpg`
    await uploadFile(asset.uri, name, asset.mimeType || 'image/jpeg')
  }, [uploadFile])

  // Pick document (pdf, csv, xlsx)
  const handlePickDocument = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      copyToCacheDirectory: true,
    })
    if (result.canceled || !result.assets?.[0]) return
    const file = result.assets[0]
    await uploadFile(file.uri, file.name, file.mimeType || 'application/octet-stream')
  }, [uploadFile])

  // ActionSheet to choose attach source
  const handleAttachPress = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancelar', 'Tirar foto', 'Escolher da galeria', 'Escolher documento'],
          cancelButtonIndex: 0,
          title: 'Anexar ficheiro',
        },
        (index) => {
          if (index === 1) handleTakePhoto()
          else if (index === 2) handlePickImage()
          else if (index === 3) handlePickDocument()
        }
      )
    } else {
      Alert.alert('Anexar ficheiro', 'Escolha uma opcao', [
        { text: 'Tirar foto', onPress: handleTakePhoto },
        { text: 'Escolher da galeria', onPress: handlePickImage },
        { text: 'Escolher documento', onPress: handlePickDocument },
        { text: 'Cancelar', style: 'cancel' },
      ])
    }
  }, [handleTakePhoto, handlePickImage, handlePickDocument])

  const handleVoiceTranscription = useCallback((text: string) => {
    setInput(text)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }, [])

  const handleNewConversation = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    clearChat()
  }, [clearChat])

  const mdStyles = isDark ? darkMdStyles : lightMdStyles

  const renderAssistantSegments = (content: string) => {
    const segments = parseAssistantContent(content)
    return segments.map((seg, i) => {
      if (seg.type === 'metrics' && seg.parsed) {
        return <MetricCards key={`seg-${i}`} data={seg.parsed as MetricConfig[]} />
      }
      if (seg.type === 'chart' && seg.parsed) {
        return <InlineChart key={`seg-${i}`} {...(seg.parsed as InlineChartProps)} />
      }
      return <Markdown key={`seg-${i}`} style={mdStyles}>{seg.content || ' '}</Markdown>
    })
  }

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user'

    // Hide the empty assistant placeholder while loading (ThinkingDots handles the indicator)
    if (!isUser && !item.content && isLoading) return null

    return isUser ? (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{item.content}</Text>
        </View>
      </View>
    ) : (
      <View style={styles.assistantRow}>
        <View style={styles.botAvatarTiny}>
          <Ionicons name="chatbubble-ellipses" size={14} color={colors.primary} />
        </View>
        <View style={styles.assistantContent}>
          {item.agent && item.agent !== 'system' && (
            <Text style={styles.agentLabel}>FINANCEIRO</Text>
          )}
          {renderAssistantSegments(item.content || '')}
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tc.bg }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: tc.text }]}>Assistente</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ContextSwitcher />
            {messages.length > 0 && (
              <Pressable onPress={clearChat} style={styles.clearBtn}>
                <Ionicons name="trash-outline" size={18} color={tc.icon} />
              </Pressable>
            )}
          </View>
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
              <View style={styles.botBadge}>
                <Ionicons name="chatbubble-ellipses" size={28} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: tc.text }]}>
                {isFamilyContext() ? 'Assistente Familiar' : 'Assistente Financeiro'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: tc.textMuted }]}>
                {isFamilyContext()
                  ? 'Pergunte sobre as financas da familia, orcamento conjunto, ou gastos dos membros.'
                  : 'Podes dizer-me quanto gastaste, perguntar o teu saldo, ou pedir conselhos sobre as tuas financas.'}
              </Text>

              {/* Quick Actions — context-aware */}
              <View style={styles.quickActions}>
                {(isFamilyContext() ? FAMILY_ACTIONS : PERSONAL_ACTIONS).map((action) => (
                  <Pressable
                    key={action.label}
                    style={[styles.quickAction, { borderColor: tc.border, backgroundColor: tc.card }]}
                    onPress={() => handleQuickAction(action.label)}
                  >
                    <Text style={[styles.quickCategory, { color: tc.textMuted }]}>{action.category}</Text>
                    <Text style={[styles.quickActionText, { color: tc.textSecondary }]}>
                      {action.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          }
          ListFooterComponent={
            <>
              {isLoading && <ThinkingDots isDark={isDark} progressMsg={progressMessage} />}
              {messages.length > 0 && !isLoading && (
                <Pressable onPress={handleNewConversation} style={styles.newConversation}>
                  <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                  <Text style={styles.newConversationText}>Nova conversa</Text>
                </Pressable>
              )}
            </>
          }
        />

        {/* Input */}
        <View style={styles.inputWrapper}>
          <View style={[styles.inputContainer, { borderColor: tc.border, backgroundColor: tc.card }]}>
            <Pressable
              style={styles.attachBtn}
              onPress={handleAttachPress}
              disabled={uploading || isLoading}
            >
              <Ionicons
                name="attach-outline"
                size={22}
                color={uploading ? tc.textMuted : tc.icon}
              />
            </Pressable>
            <VoiceRecorder
              onTranscription={handleVoiceTranscription}
              disabled={isLoading || uploading}
            />
            <TextInput
              style={[styles.input, { color: tc.text }]}
              placeholder="Escreve uma mensagem..."
              placeholderTextColor={tc.textMuted}
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
              <Ionicons name="arrow-up" size={18} color="#fff" />
            </Pressable>
          </View>
          <Text style={[styles.disclaimer, { color: tc.textMuted }]}>
            O assistente pode cometer erros. Verifique informacoes importantes.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// Markdown styles
const lightMdStyles = StyleSheet.create({
  body: { fontSize: 15, lineHeight: 22, color: colors.light.text },
  heading1: { fontSize: 18, fontWeight: '700' as const, marginBottom: 4 },
  heading2: { fontSize: 16, fontWeight: '700' as const, marginBottom: 4 },
  heading3: { fontSize: 15, fontWeight: '600' as const, marginBottom: 4 },
  paragraph: { marginBottom: 8 },
  strong: { fontWeight: '700' as const },
  bullet_list: { marginBottom: 8 },
  ordered_list: { marginBottom: 8 },
  list_item: { marginBottom: 4 },
  code_inline: { backgroundColor: colors.light.borderLight, paddingHorizontal: 4, borderRadius: 4, fontFamily: 'monospace', fontSize: 13 },
  fence: { backgroundColor: colors.light.borderLight, padding: 10, borderRadius: 8, fontFamily: 'monospace', fontSize: 13 },
  table: { borderWidth: 1, borderColor: colors.light.border },
  thead: { backgroundColor: colors.light.bg },
  th: { padding: 6, fontWeight: '600' as const },
  td: { padding: 6 },
  tr: { borderBottomWidth: 0.5, borderColor: colors.light.border },
})

const darkMdStyles = StyleSheet.create({
  body: { fontSize: 15, lineHeight: 22, color: colors.dark.text },
  heading1: { fontSize: 18, fontWeight: '700' as const, color: colors.dark.text, marginBottom: 4 },
  heading2: { fontSize: 16, fontWeight: '700' as const, color: colors.dark.text, marginBottom: 4 },
  heading3: { fontSize: 15, fontWeight: '600' as const, color: colors.dark.text, marginBottom: 4 },
  paragraph: { marginBottom: 8, color: colors.dark.text },
  strong: { fontWeight: '700' as const, color: colors.dark.text },
  bullet_list: { marginBottom: 8 },
  ordered_list: { marginBottom: 8 },
  list_item: { marginBottom: 4, color: '#eee' },
  code_inline: { backgroundColor: colors.dark.border, color: colors.light.border, paddingHorizontal: 4, borderRadius: 4, fontFamily: 'monospace', fontSize: 13 },
  fence: { backgroundColor: colors.dark.borderLight, color: colors.light.border, padding: 10, borderRadius: 8, fontFamily: 'monospace', fontSize: 13 },
  table: { borderWidth: 1, borderColor: '#444' },
  thead: { backgroundColor: colors.dark.border },
  th: { padding: 6, fontWeight: '600' as const, color: colors.dark.text },
  td: { padding: 6, color: '#eee' },
  tr: { borderBottomWidth: 0.5, borderColor: '#444' },
})

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  title: { fontSize: 24, fontWeight: '700' },
  clearBtn: { padding: 8 },
  messageList: { paddingHorizontal: 16, paddingBottom: 8, flexGrow: 1 },

  // User messages
  userRow: { flexDirection: 'row', justifyContent: 'flex-end', marginVertical: 4 },
  userBubble: {
    maxWidth: '80%',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderBottomRightRadius: 6,
  },
  userText: { fontSize: 15, lineHeight: 22, color: '#FFFFFF' },

  // Assistant messages
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
    gap: 8,
  },
  botAvatarTiny: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  assistantContent: {
    flex: 1,
  },
  agentLabel: {
    fontSize: 10,
    color: colors.primary + 'B3', // 70% opacity
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Thinking indicator
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  botAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: 12,
    color: colors.light.textMuted,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  thinkingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },

  // New conversation link
  newConversation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  newConversationText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },

  // Empty state
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 80 },
  botBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  quickActions: { marginTop: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%' },
  quickAction: {
    width: '48%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickCategory: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  quickActionText: { fontSize: 14 },

  // Input area
  inputWrapper: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  attachBtn: { padding: 8 },
  input: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 8,
    paddingVertical: 8,
    maxHeight: 100,
    backgroundColor: 'transparent',
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
    marginBottom: 2,
  },
  sendBtnDisabled: { opacity: 0.3 },
  disclaimer: {
    fontSize: 10,
    textAlign: 'center',
    paddingVertical: 6,
  },
})
