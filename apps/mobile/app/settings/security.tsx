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
  Switch,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { apiFetch } from '../../lib/api'
import { colors, themeColors } from '../../lib/tokens'
import {
  isBiometricAvailable,
  getBiometricType,
  isBiometricEnabled,
  setBiometricEnabled,
  authenticate,
} from '../../lib/biometrics'

export default function SecurityScreen() {
  const isDark = useColorScheme() === 'dark'
  const router = useRouter()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  // Biometrics
  const [bioAvailable, setBioAvailable] = useState(false)
  const [bioType, setBioType] = useState<string | null>(null)
  const [bioEnabled, setBioEnabled] = useState(false)

  useEffect(() => {
    async function checkBio() {
      const available = await isBiometricAvailable()
      setBioAvailable(available)
      if (available) {
        setBioType(await getBiometricType())
        setBioEnabled(await isBiometricEnabled())
      }
    }
    checkBio()
  }, [])

  async function handleToggleBiometric(value: boolean) {
    if (value) {
      const success = await authenticate('Active a biometria para proteger a app')
      if (!success) return
    }
    await setBiometricEnabled(value)
    setBioEnabled(value)
  }

  async function handleChangePassword() {
    if (!newPassword.trim()) {
      Alert.alert('Erro', 'Preencha a nova senha')
      return
    }
    if (newPassword.length < 6) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Erro', 'As senhas nao coincidem')
      return
    }
    Keyboard.dismiss()
    setSaving(true)
    try {
      await apiFetch('/api/v1/users/me/password', {
        method: 'PUT',
        body: JSON.stringify({
          current_password: currentPassword || null,
          new_password: newPassword,
        }),
      })
      Alert.alert('Sucesso', 'Senha alterada com sucesso')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao alterar senha')
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
            <Text style={[styles.title, { color: text }]}>Seguranca</Text>
          </View>

          <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
            <Text style={[styles.sectionLabel, { color: text }]}>Alterar senha</Text>

            <Text style={[styles.label, { color: muted }]}>Senha actual (se tiver)</Text>
            <TextInput
              style={[styles.input, { borderColor: border, color: text }]}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Deixe vazio se nao definiu"
              placeholderTextColor={muted}
              secureTextEntry
            />

            <Text style={[styles.label, { color: muted, marginTop: 16 }]}>Nova senha</Text>
            <TextInput
              style={[styles.input, { borderColor: border, color: text }]}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Minimo 6 caracteres"
              placeholderTextColor={muted}
              secureTextEntry
            />

            <Text style={[styles.label, { color: muted, marginTop: 16 }]}>Confirmar nova senha</Text>
            <TextInput
              style={[styles.input, { borderColor: border, color: text }]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repita a nova senha"
              placeholderTextColor={muted}
              secureTextEntry
            />

            <Pressable
              style={[styles.saveBtn, { backgroundColor: accent }, saving && { opacity: 0.6 }]}
              onPress={handleChangePassword}
              disabled={saving}
            >
              <Text style={[styles.saveBtnText, { color: isDark ? '#000' : '#fff' }]}>
                {saving ? 'A alterar...' : 'Alterar senha'}
              </Text>
            </Pressable>
          </View>

          {/* Biometric auth */}
          {bioAvailable && (
            <View style={[styles.card, { backgroundColor: card, borderColor: border, marginTop: 16 }]}>
              <Text style={[styles.sectionLabel, { color: text }]}>Biometria</Text>
              <View style={styles.bioRow}>
                <View style={styles.bioInfo}>
                  <Ionicons
                    name={bioType === 'Face ID' ? 'scan-outline' : 'finger-print-outline'}
                    size={22}
                    color={muted}
                  />
                  <View>
                    <Text style={[styles.bioLabel, { color: text }]}>
                      {bioType || 'Biometria'}
                    </Text>
                    <Text style={[styles.bioDesc, { color: muted }]}>
                      Proteger abertura da app
                    </Text>
                  </View>
                </View>
                <Switch
                  value={bioEnabled}
                  onValueChange={handleToggleBiometric}
                  trackColor={{ false: tc.border, true: colors.success }}
                />
              </View>
            </View>
          )}
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
  sectionLabel: { fontSize: 17, fontWeight: '600', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  saveBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: { fontSize: 16, fontWeight: '600' },
  bioRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bioInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  bioLabel: { fontSize: 15, fontWeight: '500' },
  bioDesc: { fontSize: 12, marginTop: 2 },
})
