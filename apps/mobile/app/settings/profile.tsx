import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { apiFetch } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

export default function ProfileScreen() {
  const isDark = useColorScheme() === 'dark'
  const router = useRouter()
  const { user, fetchUser } = useAuthStore()

  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email || '')
    }
  }, [user])

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Erro', 'O nome nao pode estar vazio')
      return
    }
    Keyboard.dismiss()
    setSaving(true)
    try {
      await apiFetch('/api/v1/users/me', {
        method: 'PUT',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
        }),
      })
      await fetchUser()
      Alert.alert('Sucesso', 'Perfil actualizado')
      router.back()
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao guardar')
    } finally {
      setSaving(false)
    }
  }

  const bg = isDark ? '#000' : '#f5f5f5'
  const card = isDark ? '#1a1a1a' : '#fff'
  const text = isDark ? '#fff' : '#000'
  const muted = isDark ? '#888' : '#666'
  const border = isDark ? '#333' : '#e5e5e5'
  const accent = isDark ? '#fff' : '#000'

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={text} />
            </Pressable>
            <Text style={[styles.title, { color: text }]}>Perfil</Text>
          </View>

          <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
            <Text style={[styles.label, { color: muted }]}>Nome</Text>
            <TextInput
              style={[styles.input, { borderColor: border, color: text }]}
              value={name}
              onChangeText={setName}
              placeholder="O seu nome"
              placeholderTextColor={muted}
              autoCapitalize="words"
            />

            <Text style={[styles.label, { color: muted, marginTop: 16 }]}>Email</Text>
            <TextInput
              style={[styles.input, { borderColor: border, color: text }]}
              value={email}
              onChangeText={setEmail}
              placeholder="email@exemplo.com"
              placeholderTextColor={muted}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[styles.label, { color: muted, marginTop: 16 }]}>Telefone</Text>
            <View style={[styles.readonlyField, { borderColor: border }]}>
              <Text style={[styles.readonlyText, { color: muted }]}>
                {user?.phone || '—'}
              </Text>
              <Ionicons name="lock-closed-outline" size={16} color={muted} />
            </View>

            <Pressable
              style={[styles.saveBtn, { backgroundColor: accent }, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={[styles.saveBtnText, { color: isDark ? '#000' : '#fff' }]}>
                {saving ? 'A guardar...' : 'Guardar alteracoes'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  backBtn: { padding: 4, marginRight: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  card: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, padding: 20 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  readonlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    opacity: 0.6,
  },
  readonlyText: { fontSize: 16 },
  saveBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: { fontSize: 16, fontWeight: '600' },
})
