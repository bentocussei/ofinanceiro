import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { apiFetch } from '../../lib/api'
import { colors, themeColors } from '../../lib/tokens'

interface Tag {
  id: string
  name: string
  color?: string
}

export default function TagsScreen() {
  const isDark = useColorScheme() === 'dark'
  const router = useRouter()
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [newTag, setNewTag] = useState('')
  const [adding, setAdding] = useState(false)

  const tc = themeColors(isDark)
  const bg = tc.bg
  const card = tc.card
  const text = tc.text
  const muted = tc.textSecondary
  const border = tc.border
  const accent = tc.text

  useEffect(() => {
    fetchTags()
  }, [])

  async function fetchTags() {
    try {
      const data = await apiFetch<Tag[]>('/api/v1/tags/')
      setTags(data)
    } catch {
      // Tags may not be available
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd() {
    if (!newTag.trim()) return
    setAdding(true)
    try {
      await apiFetch('/api/v1/tags/', {
        method: 'POST',
        body: JSON.stringify({ name: newTag.trim() }),
      })
      setNewTag('')
      fetchTags()
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao criar tag')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(tag: Tag) {
    Alert.alert('Eliminar tag', `Eliminar "${tag.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiFetch(`/api/v1/tags/${tag.id}`, { method: 'DELETE' })
            fetchTags()
          } catch (error: any) {
            Alert.alert('Erro', error.message || 'Erro ao eliminar')
          }
        },
      },
    ])
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={text} />
        </Pressable>
        <Text style={[styles.title, { color: text }]}>Tags</Text>
      </View>

      {/* Add tag */}
      <View style={[styles.addRow, { backgroundColor: card, borderColor: border }]}>
        <TextInput
          style={[styles.addInput, { color: text }]}
          value={newTag}
          onChangeText={setNewTag}
          placeholder="Nova tag..."
          placeholderTextColor={muted}
          onSubmitEditing={handleAdd}
        />
        <Pressable
          style={[styles.addBtn, { backgroundColor: accent }, adding && { opacity: 0.6 }]}
          onPress={handleAdd}
          disabled={adding || !newTag.trim()}
        >
          <Ionicons name="add" size={20} color={isDark ? '#000' : '#fff'} />
        </Pressable>
      </View>

      <FlatList
        data={tags}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.tagRow, { backgroundColor: card, borderColor: border }]}>
            <Ionicons name="pricetag" size={16} color={item.color || muted} />
            <Text style={[styles.tagName, { color: text }]}>{item.name}</Text>
            <Pressable onPress={() => handleDelete(item)}>
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={[styles.emptyText, { color: muted }]}>Nenhuma tag criada</Text>
          ) : null
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  backBtn: { padding: 4, marginRight: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 4,
    marginBottom: 16,
  },
  addInput: { flex: 1, fontSize: 15, paddingVertical: 10 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingHorizontal: 16, gap: 8 },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  tagName: { flex: 1, fontSize: 15 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
})
