import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useState, useRef } from 'react'
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

import { themeColors } from '../lib/tokens'
import { useAuthStore } from '../stores/auth'

type Tab = 'password' | 'otp'
type OtpStep = 'phone' | 'verify'

const COUNTRY_CODES = [
  { code: '+244', flag: '\u{1F1E6}\u{1F1F4}', label: 'AO' },
  { code: '+258', flag: '\u{1F1F2}\u{1F1FF}', label: 'MZ' },
  { code: '+238', flag: '\u{1F1E8}\u{1F1FB}', label: 'CV' },
  { code: '+351', flag: '\u{1F1F5}\u{1F1F9}', label: 'PT' },
  { code: '+55', flag: '\u{1F1E7}\u{1F1F7}', label: 'BR' },
]

export default function LoginScreen() {
  const isDark = useColorScheme() === 'dark'
  const router = useRouter()
  const { login, sendOtp, verifyOtp, isLoading } = useAuthStore()

  const [tab, setTab] = useState<Tab>('otp')
  const [countryIndex, setCountryIndex] = useState(0)
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // OTP state
  const [otpStep, setOtpStep] = useState<OtpStep>('phone')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [countdown, setCountdown] = useState(0)
  const otpRefs = useRef<(TextInput | null)[]>([])
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const country = COUNTRY_CODES[countryIndex]
  const fullPhone = `${country.code}${phone.replace(/\s/g, '')}`

  function startCountdown() {
    setCountdown(60)
    if (countdownRef.current) clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function maskPhone(p: string): string {
    const digits = p.replace(/\D/g, '')
    if (digits.length <= 4) return digits
    return digits.slice(0, 3) + ' *** ' + digits.slice(-2)
  }

  async function handlePasswordLogin() {
    if (!phone.trim() || !password.trim()) {
      Alert.alert('Erro', 'Preencha o telefone e a senha')
      return
    }
    Keyboard.dismiss()
    try {
      await login(fullPhone, password)
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Credenciais invalidas')
    }
  }

  async function handleSendOtp() {
    if (!phone.trim()) {
      Alert.alert('Erro', 'Preencha o numero de telefone')
      return
    }
    Keyboard.dismiss()
    try {
      await sendOtp(fullPhone)
      setOtpStep('verify')
      startCountdown()
      setTimeout(() => otpRefs.current[0]?.focus(), 300)
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao enviar codigo')
    }
  }

  async function submitOtp(code: string) {
    if (code.length !== 6) return
    Keyboard.dismiss()
    try {
      await verifyOtp(fullPhone, code)
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Codigo invalido ou expirado')
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    }
  }

  function handleOtpChange(text: string, index: number) {
    // Handle paste of full code (iOS auto-fill pastes all 6 digits into first field)
    const digits = text.replace(/\D/g, '')
    if (digits.length >= 6) {
      const filled = digits.slice(0, 6).split('')
      setOtp(filled)
      otpRefs.current[5]?.focus()
      submitOtp(filled.join(''))
      return
    }

    const digit = digits.slice(-1)
    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits entered
    const code = newOtp.join('')
    if (code.length === 6 && !code.includes('')) {
      submitOtp(code)
    }
  }

  function handleOtpKeyPress(key: string, index: number) {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  function cycleCountry() {
    setCountryIndex((prev) => (prev + 1) % COUNTRY_CODES.length)
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
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo / Brand */}
          <View style={styles.brand}>
            <Text style={[styles.brandTitle, { color: text }]}>O Financeiro</Text>
            <Text style={[styles.brandSubtitle, { color: muted }]}>
              O teu financeiro pessoal e familiar
            </Text>
          </View>

          {/* Tab Switcher */}
          <View style={[styles.tabRow, { backgroundColor: card, borderColor: border }]}>
            <Pressable
              style={[styles.tab, tab === 'otp' && { backgroundColor: accent }]}
              onPress={() => { setTab('otp'); setOtpStep('phone') }}
            >
              <Ionicons
                name="chatbubble-outline"
                size={16}
                color={tab === 'otp' ? (isDark ? '#000' : '#fff') : muted}
              />
              <Text style={[
                styles.tabText,
                { color: tab === 'otp' ? (isDark ? '#000' : '#fff') : muted },
              ]}>
                Com codigo SMS
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, tab === 'password' && { backgroundColor: accent }]}
              onPress={() => { setTab('password'); setOtpStep('phone') }}
            >
              <Ionicons
                name="key-outline"
                size={16}
                color={tab === 'password' ? (isDark ? '#000' : '#fff') : muted}
              />
              <Text style={[
                styles.tabText,
                { color: tab === 'password' ? (isDark ? '#000' : '#fff') : muted },
              ]}>
                Com senha
              </Text>
            </Pressable>
          </View>

          {/* Password Login */}
          {tab === 'password' && (
            <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
              <Text style={[styles.label, { color: muted }]}>Numero de telefone</Text>
              <View style={[styles.phoneRow, { borderColor: border }]}>
                <Pressable style={styles.countryBtn} onPress={cycleCountry}>
                  <Text style={styles.countryFlag}>{country.flag}</Text>
                  <Text style={[styles.countryCode, { color: text }]}>{country.code}</Text>
                </Pressable>
                <TextInput
                  style={[styles.phoneInput, { color: text }]}
                  placeholder="9XX XXX XXX"
                  placeholderTextColor={muted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>

              <Text style={[styles.label, { color: muted, marginTop: 16 }]}>Senha</Text>
              <View style={[styles.passwordRow, { borderColor: border }]}>
                <TextInput
                  style={[styles.passwordInput, { color: text }]}
                  placeholder="A sua senha"
                  placeholderTextColor={muted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  onSubmitEditing={handlePasswordLogin}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={muted}
                  />
                </Pressable>
              </View>

              <Pressable
                style={[styles.submitBtn, { backgroundColor: accent }, isLoading && styles.submitDisabled]}
                onPress={handlePasswordLogin}
                disabled={isLoading}
              >
                <Text style={[styles.submitText, { color: isDark ? '#000' : '#fff' }]}>
                  {isLoading ? 'A entrar...' : 'Entrar'}
                </Text>
              </Pressable>
            </View>
          )}

          {/* OTP Login */}
          {tab === 'otp' && otpStep === 'phone' && (
            <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
              <Text style={[styles.label, { color: muted }]}>Numero de telefone</Text>
              <View style={[styles.phoneRow, { borderColor: border }]}>
                <Pressable style={styles.countryBtn} onPress={cycleCountry}>
                  <Text style={styles.countryFlag}>{country.flag}</Text>
                  <Text style={[styles.countryCode, { color: text }]}>{country.code}</Text>
                </Pressable>
                <TextInput
                  style={[styles.phoneInput, { color: text }]}
                  placeholder="9XX XXX XXX"
                  placeholderTextColor={muted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  onSubmitEditing={handleSendOtp}
                />
              </View>

              <Pressable
                style={[styles.submitBtn, { backgroundColor: accent }, isLoading && styles.submitDisabled]}
                onPress={handleSendOtp}
                disabled={isLoading}
              >
                <Text style={[styles.submitText, { color: isDark ? '#000' : '#fff' }]}>
                  {isLoading ? 'A enviar...' : 'Enviar codigo SMS'}
                </Text>
              </Pressable>
            </View>
          )}

          {/* OTP Verify */}
          {tab === 'otp' && otpStep === 'verify' && (
            <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
              <Text style={[styles.otpTitle, { color: text }]}>Enviamos um codigo para</Text>
              <Text style={[styles.otpPhone, { color: muted }]}>
                {country.code} {maskPhone(phone)}
              </Text>

              <View style={styles.otpRow}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={(ref) => { otpRefs.current[i] = ref }}
                    style={[
                      styles.otpInput,
                      { backgroundColor: tc.input, borderColor: border, color: text },
                      digit && { borderColor: accent },
                    ]}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    autoComplete="sms-otp"
                    maxLength={i === 0 ? 6 : 1}
                    value={digit}
                    onChangeText={(t) => handleOtpChange(t, i)}
                    onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                    selectTextOnFocus
                  />
                ))}
              </View>

              <View style={styles.otpActions}>
                <Pressable onPress={() => { setOtpStep('phone'); setOtp(['', '', '', '', '', '']) }}>
                  <Text style={[styles.otpLink, { color: muted }]}>Voltar</Text>
                </Pressable>
                <Pressable onPress={countdown === 0 ? handleSendOtp : undefined}>
                  <Text style={[styles.otpLink, { color: countdown > 0 ? muted : accent }]}>
                    {countdown > 0 ? `Reenviar em ${countdown}s` : 'Reenviar codigo'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Register link */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: muted }]}>Nao tem conta? </Text>
            <Pressable onPress={() => router.push('/register')}>
              <Text style={[styles.footerLink, { color: accent }]}>Criar conta</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center' },
  brand: { alignItems: 'center', marginBottom: 32 },
  brandTitle: { fontSize: 28, fontWeight: '800' },
  brandSubtitle: { fontSize: 14, marginTop: 4 },
  tabRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  tabText: { fontSize: 13, fontWeight: '600' },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 8 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 4,
  },
  countryFlag: { fontSize: 18 },
  countryCode: { fontSize: 14, fontWeight: '500' },
  phoneInput: { flex: 1, fontSize: 16, paddingVertical: 14, paddingRight: 12 },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  passwordInput: { flex: 1, fontSize: 16, paddingVertical: 14, paddingHorizontal: 12 },
  eyeBtn: { paddingHorizontal: 12 },
  submitBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { fontSize: 16, fontWeight: '600' },
  otpTitle: { fontSize: 15, textAlign: 'center' },
  otpPhone: { fontSize: 14, textAlign: 'center', marginTop: 4, marginBottom: 24 },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  otpInput: {
    width: 44,
    height: 52,
    borderRadius: 10,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  otpLink: { fontSize: 14, fontWeight: '500' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 8, marginBottom: 40 },
  footerText: { fontSize: 14 },
  footerLink: { fontSize: 14, fontWeight: '600' },
})
