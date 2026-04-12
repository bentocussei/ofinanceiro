import { Ionicons } from '@expo/vector-icons'
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import { useState, useRef, useEffect } from 'react'
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

import { useAuthStore } from '../stores/auth'

type Step = 'form' | 'otp'

const COUNTRIES = [
  { code: 'AO', dial: '+244', flag: '\u{1F1E6}\u{1F1F4}', label: 'Angola' },
  { code: 'MZ', dial: '+258', flag: '\u{1F1F2}\u{1F1FF}', label: 'Mocambique' },
  { code: 'CV', dial: '+238', flag: '\u{1F1E8}\u{1F1FB}', label: 'Cabo Verde' },
  { code: 'PT', dial: '+351', flag: '\u{1F1F5}\u{1F1F9}', label: 'Portugal' },
  { code: 'BR', dial: '+55', flag: '\u{1F1E7}\u{1F1F7}', label: 'Brasil' },
  { code: 'GW', dial: '+245', flag: '\u{1F1EC}\u{1F1FC}', label: 'Guine-Bissau' },
  { code: 'ST', dial: '+239', flag: '\u{1F1F8}\u{1F1F9}', label: 'Sao Tome' },
  { code: 'TL', dial: '+670', flag: '\u{1F1F9}\u{1F1F1}', label: 'Timor-Leste' },
]

export default function RegisterScreen() {
  const isDark = useColorScheme() === 'dark'
  const router = useRouter()
  const { register, sendOtp, verifyOtp, isLoading } = useAuthStore()

  const [step, setStep] = useState<Step>('form')
  const [countryIndex, setCountryIndex] = useState(0)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [showPromo, setShowPromo] = useState(false)

  // Referral from deep link
  const [referralCode, setReferralCode] = useState<string | undefined>()

  // OTP state
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [countdown, setCountdown] = useState(0)
  const otpRefs = useRef<(TextInput | null)[]>([])
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const country = COUNTRIES[countryIndex]
  const fullPhone = `${country.dial}${phone.replace(/\s/g, '')}`

  // Check for referral code in deep link
  useEffect(() => {
    async function checkUrl() {
      const url = await Linking.getInitialURL()
      if (url) {
        const parsed = Linking.parse(url)
        const ref = parsed.queryParams?.ref as string | undefined
        if (ref) setReferralCode(ref)
      }
    }
    checkUrl()

    const sub = Linking.addEventListener('url', ({ url }) => {
      const parsed = Linking.parse(url)
      const ref = parsed.queryParams?.ref as string | undefined
      if (ref) setReferralCode(ref)
    })
    return () => sub.remove()
  }, [])

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

  async function handleRegister() {
    if (!name.trim()) {
      Alert.alert('Erro', 'Preencha o seu nome')
      return
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 7) {
      Alert.alert('Erro', 'Preencha um numero de telefone valido')
      return
    }
    Keyboard.dismiss()
    try {
      await register({
        phone: fullPhone,
        name: name.trim(),
        country: country.code,
        promoCode: promoCode.trim() || undefined,
        referralCode,
      })
      setStep('otp')
      startCountdown()
      setTimeout(() => otpRefs.current[0]?.focus(), 300)
    } catch (error: any) {
      const msg = error.code === 'PHONE_EXISTS'
        ? 'Este numero ja esta registado'
        : error.message || 'Erro ao criar conta'
      Alert.alert('Erro', msg)
    }
  }

  async function handleVerifyOtp() {
    const code = otp.join('')
    if (code.length !== 6) return
    try {
      await verifyOtp(fullPhone, code)
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Codigo invalido ou expirado')
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    }
  }

  async function handleResendOtp() {
    try {
      await sendOtp(fullPhone)
      startCountdown()
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao reenviar codigo')
    }
  }

  function handleOtpChange(text: string, index: number) {
    const digit = text.replace(/\D/g, '').slice(-1)
    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
    if (digit && index === 5) {
      const code = newOtp.join('')
      if (code.length === 6) {
        Keyboard.dismiss()
        setTimeout(() => handleVerifyOtp(), 100)
      }
    }
  }

  function handleOtpKeyPress(key: string, index: number) {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  function cycleCountry() {
    setCountryIndex((prev) => (prev + 1) % COUNTRIES.length)
  }

  const bg = isDark ? '#000' : '#f5f5f5'
  const card = isDark ? '#1a1a1a' : '#fff'
  const text_ = isDark ? '#fff' : '#000'
  const muted = isDark ? '#888' : '#666'
  const border = isDark ? '#333' : '#e5e5e5'
  const accent = isDark ? '#fff' : '#000'
  const primary = '#2563eb'

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
          {/* Header */}
          <View style={styles.brand}>
            <Text style={[styles.brandTitle, { color: text_ }]}>Criar conta</Text>
            <Text style={[styles.brandSubtitle, { color: muted }]}>
              Comeca a gerir as tuas financas
            </Text>
          </View>

          {/* Referral banner */}
          {referralCode && step === 'form' && (
            <View style={[styles.referralBanner, { borderColor: primary + '40', backgroundColor: primary + '10' }]}>
              <Ionicons name="gift-outline" size={18} color={primary} />
              <Text style={[styles.referralText, { color: primary }]}>
                Foste convidado por um amigo! Ambos ganharao 30 dias gratis apos o registo.
              </Text>
            </View>
          )}

          {step === 'form' && (
            <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
              {/* Name */}
              <Text style={[styles.label, { color: muted }]}>Nome completo</Text>
              <TextInput
                style={[styles.input, { borderColor: border, color: text_ }]}
                placeholder="O seu nome"
                placeholderTextColor={muted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />

              {/* Phone */}
              <Text style={[styles.label, { color: muted, marginTop: 16 }]}>Numero de telefone</Text>
              <View style={[styles.phoneRow, { borderColor: border }]}>
                <Pressable style={styles.countryBtn} onPress={cycleCountry}>
                  <Text style={styles.countryFlag}>{country.flag}</Text>
                  <Text style={[styles.countryCode, { color: text_ }]}>{country.dial}</Text>
                </Pressable>
                <TextInput
                  style={[styles.phoneInput, { color: text_ }]}
                  placeholder="9XX XXX XXX"
                  placeholderTextColor={muted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>

              {/* Promo Code (toggle) */}
              {!showPromo ? (
                <Pressable
                  style={styles.promoToggle}
                  onPress={() => setShowPromo(true)}
                >
                  <Ionicons name="pricetag-outline" size={16} color={muted} />
                  <Text style={[styles.promoToggleText, { color: muted }]}>
                    Tenho um codigo promocional
                  </Text>
                </Pressable>
              ) : (
                <>
                  <Text style={[styles.label, { color: muted, marginTop: 16 }]}>Codigo promocional</Text>
                  <TextInput
                    style={[styles.input, { borderColor: border, color: text_ }]}
                    placeholder="Ex: PROMO2026"
                    placeholderTextColor={muted}
                    value={promoCode}
                    onChangeText={(t) => setPromoCode(t.toUpperCase())}
                    autoCapitalize="characters"
                  />
                </>
              )}

              <Pressable
                style={[styles.submitBtn, { backgroundColor: accent }, isLoading && styles.submitDisabled]}
                onPress={handleRegister}
                disabled={isLoading}
              >
                <Text style={[styles.submitText, { color: isDark ? '#000' : '#fff' }]}>
                  {isLoading ? 'A criar conta...' : 'Criar conta'}
                </Text>
              </Pressable>
            </View>
          )}

          {/* OTP Verification */}
          {step === 'otp' && (
            <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
              <Text style={[styles.otpTitle, { color: text_ }]}>Enviamos um codigo para</Text>
              <Text style={[styles.otpPhone, { color: muted }]}>
                {country.dial} {maskPhone(phone)}
              </Text>

              <View style={styles.otpRow}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={(ref) => { otpRefs.current[i] = ref }}
                    style={[
                      styles.otpInput,
                      { backgroundColor: isDark ? '#111' : '#f9f9f9', borderColor: border, color: text_ },
                      digit && { borderColor: accent },
                    ]}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={(t) => handleOtpChange(t, i)}
                    onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                    selectTextOnFocus
                  />
                ))}
              </View>

              <View style={styles.otpActions}>
                <Pressable onPress={() => { setStep('form'); setOtp(['', '', '', '', '', '']) }}>
                  <Text style={[styles.otpLink, { color: muted }]}>Voltar</Text>
                </Pressable>
                <Pressable onPress={countdown === 0 ? handleResendOtp : undefined}>
                  <Text style={[styles.otpLink, { color: countdown > 0 ? muted : accent }]}>
                    {countdown > 0 ? `Reenviar em ${countdown}s` : 'Reenviar codigo'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Login link */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: muted }]}>Ja tem conta? </Text>
            <Pressable onPress={() => router.back()}>
              <Text style={[styles.footerLink, { color: accent }]}>Entrar</Text>
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
  brand: { alignItems: 'center', marginBottom: 24 },
  brandTitle: { fontSize: 24, fontWeight: '800' },
  brandSubtitle: { fontSize: 14, marginTop: 4 },
  referralBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  referralText: { flex: 1, fontSize: 13, lineHeight: 18 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 16,
  },
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
  promoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  promoToggleText: { fontSize: 13 },
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
