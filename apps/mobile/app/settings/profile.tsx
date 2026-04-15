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
import { themeColors } from '../../lib/tokens'
import { useAuthStore } from '../../stores/auth'

export default function ProfileScreen() {
  const isDark = useColorScheme() === 'dark'
  const router = useRouter()
  const { user, fetchUser } = useAuthStore()

  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [currency, setCurrency] = useState('AOA')
  const [salaryDay, setSalaryDay] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email || '')
    }
    // Fetch user preferences
    apiFetch<{ currency?: string; salary_day?: number }>('/api/v1/users/me')
      .then((data: any) => {
        if (data.currency) setCurrency(data.currency)
        if (data.salary_day) setSalaryDay(String(data.salary_day))
      })
      .catch(() => {})
  }, [user])

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Erro', 'O nome não pode estar vazio')
      return
    }
    let parsedSalaryDay: number | null = null
    if (salaryDay.trim()) {
      const n = parseInt(salaryDay, 10)
      if (isNaN(n) || n < 1 || n > 31) {
        Alert.alert('Erro', 'O dia do salário deve estar entre 1 e 31')
        return
      }
      parsedSalaryDay = n
    }
    Keyboard.dismiss()
    setSaving(true)
    try {
      await apiFetch('/api/v1/users/me', {
        method: 'PUT',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          currency,
          salary_day: parsedSalaryDay,
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

  const tc = themeColors(isDark)
  const bg = tc.bg
  const card = tc.card
  const text = tc.text
  const muted = tc.textSecondary
  const border = tc.border
  const accent = tc.text

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

            <Text style={[styles.label, { color: muted, marginTop: 16 }]}>Dia do salário</Text>
            <TextInput
              style={[styles.input, { borderColor: border, color: text }]}
              value={salaryDay}
              onChangeText={(v) => setSalaryDay(v.replace(/[^0-9]/g, '').slice(0, 2))}
              placeholder="Ex: 25"
              placeholderTextColor={muted}
              keyboardType="numeric"
              maxLength={2}
            />
            <Text style={[styles.helper, { color: muted }]}>
              Dia do mês em que recebes o salário
            </Text>

            <Text style={[styles.label, { color: muted, marginTop: 16 }]}>Telefone</Text>
            <View style={[styles.readonlyField, { borderColor: border }]}>
              <Text style={[styles.readonlyText, { color: muted }]}>
                {user?.phone || '—'}
              </Text>
              <Ionicons name="lock-closed-outline" size={16} color={muted} />
            </View>

            <Text style={[styles.label, { color: muted, marginTop: 16 }]}>Moeda preferida</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {['AOA', 'USD', 'EUR', 'MZN', 'CVE'].map((c) => (
                <Pressable
                  key={c}
                  style={[
                    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: border },
                    currency === c && { backgroundColor: accent, borderColor: accent },
                  ]}
                  onPress={() => setCurrency(c)}
                >
                  <Text style={{ fontSize: 13, fontWeight: '500', color: currency === c ? (isDark ? '#000' : '#fff') : muted }}>
                    {c}
                  </Text>
                </Pressable>
              ))}
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
  helper: { fontSize: 12, marginTop: 6 },
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
