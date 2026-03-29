import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useCallback, useRef, useState } from 'react'
import {
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
import { SafeAreaView } from 'react-native-safe-area-context'

import { ChatMessage, useChatStore } from '../../stores/chat'

const QUICK_ACTIONS = [
  { label: 'Quanto tenho?', icon: '💰' },
  { label: 'Últimas transacções', icon: '📋' },
  { label: 'Gastos deste mês', icon: '📊' },
]

export default function ChatScreen() {
  const isDark = useColorScheme() === 'dark'
  const [input, setInput] = useState('')
  const flatListRef = useRef<FlatList>(null)
  const { messages, isLoading, sendMessage, clearChat } = useChatStore()

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

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user'
    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {!isUser && item.agent && (
          <Text style={styles.agentLabel}>{item.agent}</Text>
        )}
        <Text
          style={[
            styles.messageText,
            isUser ? styles.userText : (isDark ? styles.assistantTextDark : styles.assistantText),
          ]}
        >
          {item.content}
        </Text>
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
              <Text style={styles.emptyIcon}>🤖</Text>
              <Text style={[styles.emptyTitle, isDark && styles.textLight]}>
                Olá! Sou o teu assistente financeiro.
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
                    <Text style={styles.quickActionIcon}>{action.icon}</Text>
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
          <View style={[styles.typingIndicator, isDark && styles.typingDark]}>
            <Text style={styles.typingText}>A pensar...</Text>
          </View>
        )}

        {/* Input */}
        <View style={[styles.inputContainer, isDark && styles.inputContainerDark]}>
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
  messageBubble: { maxWidth: '80%', marginVertical: 4, padding: 12, borderRadius: 16 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#000', borderBottomRightRadius: 4 },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  agentLabel: { fontSize: 10, color: '#3b82f6', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  messageText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff' },
  assistantText: { color: '#000' },
  assistantTextDark: { color: '#fff' },
  typingIndicator: { paddingHorizontal: 20, paddingVertical: 6 },
  typingDark: {},
  typingText: { fontSize: 13, color: '#999', fontStyle: 'italic' },
  inputContainer: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 8,
    borderTopWidth: 0.5, borderTopColor: '#e5e5e5', backgroundColor: '#fff',
  },
  inputContainerDark: { borderTopColor: '#333', backgroundColor: '#1a1a1a' },
  input: {
    flex: 1, fontSize: 16, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100,
    backgroundColor: '#f5f5f5', borderRadius: 20, color: '#000',
  },
  inputDark: { backgroundColor: '#222', color: '#fff' },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#000',
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  sendBtnDisabled: { opacity: 0.3 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#000', textAlign: 'center', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20 },
  quickActions: { marginTop: 24, gap: 8, width: '100%' },
  quickAction: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e5e5',
  },
  quickActionDark: { backgroundColor: '#1a1a1a', borderColor: '#333' },
  quickActionIcon: { fontSize: 18 },
  quickActionText: { fontSize: 14, color: '#666' },
  textLight: { color: '#fff' },
  textMuted: { color: '#999' },
})
