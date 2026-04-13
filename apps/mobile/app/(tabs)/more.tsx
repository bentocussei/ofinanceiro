import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Appearance,
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
import { colors, themeColors } from '../../lib/tokens'
import {
  AppContext,
  getContext,
  isFamilyContext,
  loadContext,
  setContext,
} from '../../lib/context'
import { useAuthStore } from '../../stores/auth'

type ThemeMode = 'system' | 'light' | 'dark'
type FamilyAction = 'none' | 'create' | 'join'

interface Family {
  id: string
  name: string
}

const THEME_CYCLE: ThemeMode[] = ['system', 'light', 'dark']
const THEME_LABELS: Record<ThemeMode, string> = {
  system: 'Sistema',
  light: 'Claro',
  dark: 'Escuro',
}
const THEME_ICONS: Record<ThemeMode, string> = {
  system: 'phone-portrait-outline',
  light: 'sunny-outline',
  dark: 'moon-outline',
}

export default function MoreScreen() {
  const isDark = useColorScheme() === 'dark'
  const tc = themeColors(isDark)
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const [currentCtx, setCurrentCtx] = useState<AppContext>('personal')
  const [family, setFamily] = useState<Family | null>(null)
  const [themeMode, setThemeMode] = useState<ThemeMode>('system')
  const [familyAction, setFamilyAction] = useState<FamilyAction>('none')
  const [familyInput, setFamilyInput] = useState('')
  const [familyLoading, setFamilyLoading] = useState(false)

  useEffect(() => {
    loadContext().then(setCurrentCtx)
    fetchFamily()
  }, [])

  function fetchFamily() {
    apiFetch<Family>('/api/v1/families/me')
      .then(setFamily)
      .catch(() => setFamily(null))
  }

  const isFamily = isFamilyContext()

  const switchContext = useCallback(async (ctx: AppContext) => {
    await setContext(ctx)
    setCurrentCtx(ctx)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }, [])

  async function handleCreateFamily() {
    if (!familyInput.trim()) return
    setFamilyLoading(true)
    try {
      const newFamily = await apiFetch<Family>('/api/v1/families/', {
        method: 'POST',
        body: JSON.stringify({ name: familyInput.trim() }),
      })
      setFamily(newFamily)
      setFamilyInput('')
      setFamilyAction('none')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      switchContext(`family:${newFamily.id}`)
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Nao foi possivel criar a familia')
    } finally {
      setFamilyLoading(false)
    }
  }

  async function handleJoinFamily() {
    if (!familyInput.trim()) return
    setFamilyLoading(true)
    try {
      await apiFetch('/api/v1/families/join', {
        method: 'POST',
        body: JSON.stringify({ invite_code: familyInput.trim() }),
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert('Sucesso', 'Pedido de integracao enviado. Aguarde aprovacao.')
      setFamilyInput('')
      setFamilyAction('none')
      fetchFamily()
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Codigo de convite invalido')
    } finally {
      setFamilyLoading(false)
    }
  }

  function cycleTheme() {
    const currentIndex = THEME_CYCLE.indexOf(themeMode)
    const next = THEME_CYCLE[(currentIndex + 1) % THEME_CYCLE.length]
    setThemeMode(next)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    // setColorScheme accepts 'light' | 'dark' | null (null = system default)
    Appearance.setColorScheme(next === 'system' ? null as any : next)
  }

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tc.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Profile Card */}
        <Pressable
          style={[styles.profileCard, { backgroundColor: tc.card }]}
          onPress={() => router.push('/settings')}
        >
          <View style={[styles.avatar, { backgroundColor: tc.border }]}>
            <Text style={[styles.avatarText, { color: tc.text }]}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: tc.text }]} numberOfLines={1}>
              {user?.name || 'Utilizador'}
            </Text>
            <Text style={[styles.profilePhone, { color: tc.textSecondary }]} numberOfLines={1}>
              {user?.phone || ''}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={tc.handle} />
        </Pressable>

        {/* Context Switcher — always visible */}
        {family ? (
          /* Horizontal toggle when family exists */
          <View style={[styles.contextToggle, { backgroundColor: tc.cardAlt }]}>
            <Pressable
              style={[styles.contextToggleBtn, !isFamily && { backgroundColor: colors.primary }]}
              onPress={() => switchContext('personal')}
            >
              <Ionicons name="person" size={15} color={!isFamily ? '#fff' : tc.textSecondary} />
              <Text style={[styles.contextToggleLabel, { color: !isFamily ? '#fff' : tc.textSecondary }]}>
                Pessoal
              </Text>
            </Pressable>
            <Pressable
              style={[styles.contextToggleBtn, isFamily && { backgroundColor: colors.primary }]}
              onPress={() => switchContext(`family:${family.id}`)}
            >
              <Ionicons name="people" size={15} color={isFamily ? '#fff' : tc.textSecondary} />
              <Text
                style={[styles.contextToggleLabel, { color: isFamily ? '#fff' : tc.textSecondary }]}
                numberOfLines={1}
              >
                {family.name}
              </Text>
            </Pressable>
          </View>
        ) : (
          /* Vertical card when no family — create or join */
          <View style={[styles.contextCard, { backgroundColor: tc.card }]}>
            <View style={[styles.contextOption, { borderBottomColor: tc.borderLight }]}>
              <Ionicons name="person" size={18} color={colors.primary} />
              <Text style={[styles.contextOptionLabel, { color: colors.primary }]}>Pessoal</Text>
              <Ionicons name="checkmark" size={18} color={colors.primary} />
            </View>

            {familyAction === 'none' && (
              <View style={[styles.contextActions, { borderTopColor: tc.borderLight }]}>
                <Pressable
                  style={styles.contextActionBtn}
                  onPress={() => { setFamilyAction('create'); setFamilyInput('') }}
                >
                  <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                  <Text style={[styles.contextActionLabel, { color: colors.primary }]}>
                    Criar familia
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.contextActionBtn}
                  onPress={() => { setFamilyAction('join'); setFamilyInput('') }}
                >
                  <Ionicons name="people-outline" size={18} color={tc.textSecondary} />
                  <Text style={[styles.contextActionLabel, { color: tc.textSecondary }]}>
                    Tenho um codigo
                  </Text>
                </Pressable>
              </View>
            )}

            {familyAction === 'create' && (
              <View style={[styles.contextForm, { borderTopColor: tc.borderLight }]}>
                <TextInput
                  style={[styles.contextInput, { borderColor: tc.border, color: tc.text, backgroundColor: tc.input }]}
                  placeholder="Nome da familia"
                  placeholderTextColor={tc.textMuted}
                  value={familyInput}
                  onChangeText={setFamilyInput}
                  autoFocus
                  onSubmitEditing={handleCreateFamily}
                />
                <View style={styles.contextFormRow}>
                  <Pressable
                    style={[styles.contextFormBtn, { backgroundColor: colors.primary }]}
                    onPress={handleCreateFamily}
                    disabled={familyLoading}
                  >
                    <Text style={styles.contextFormBtnText}>
                      {familyLoading ? 'A criar...' : 'Criar'}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.contextFormCancelBtn} onPress={() => setFamilyAction('none')}>
                    <Text style={[styles.contextFormCancelText, { color: tc.textSecondary }]}>Cancelar</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {familyAction === 'join' && (
              <View style={[styles.contextForm, { borderTopColor: tc.borderLight }]}>
                <TextInput
                  style={[styles.contextInput, { borderColor: tc.border, color: tc.text, backgroundColor: tc.input, fontFamily: 'monospace' }]}
                  placeholder="Codigo de convite"
                  placeholderTextColor={tc.textMuted}
                  value={familyInput}
                  onChangeText={setFamilyInput}
                  autoFocus
                  autoCapitalize="characters"
                  onSubmitEditing={handleJoinFamily}
                />
                <View style={styles.contextFormRow}>
                  <Pressable
                    style={[styles.contextFormBtn, { backgroundColor: colors.primary }]}
                    onPress={handleJoinFamily}
                    disabled={familyLoading}
                  >
                    <Text style={styles.contextFormBtnText}>
                      {familyLoading ? 'A entrar...' : 'Entrar'}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.contextFormCancelBtn} onPress={() => setFamilyAction('none')}>
                    <Text style={[styles.contextFormCancelText, { color: tc.textSecondary }]}>Cancelar</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Section: Principal */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: tc.textSecondary }]}>PRINCIPAL</Text>
          <View style={[styles.sectionCard, { backgroundColor: tc.card }]}>
            <MenuItem icon="bar-chart-outline" label="Relatorios" tc={tc} onPress={() => router.push('/(tabs)/reports')} />
            <MenuItem icon="camera-outline" label="Digitalizar recibo" tc={tc} onPress={() => router.push('/scan')} isLast />
          </View>
        </View>

        {/* Section: Gestão */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: tc.textSecondary }]}>GESTAO</Text>
          <View style={[styles.sectionCard, { backgroundColor: tc.card }]}>
            <MenuItem icon="pie-chart-outline" label={isFamily ? 'Orcamento domestico' : 'Orcamentos'} tc={tc} onPress={() => router.push('/budget')} />
            <MenuItem icon="flag-outline" label={isFamily ? 'Metas familiar' : 'Metas'} tc={tc} onPress={() => router.push('/goals')} />
            <MenuItem icon="card-outline" label="Dividas" tc={tc} onPress={() => router.push('/debts')} />
            <MenuItem icon="trending-up-outline" label="Investimentos" tc={tc} onPress={() => router.push('/investments')} />
            <MenuItem icon="cube-outline" label="Patrimonio" tc={tc} onPress={() => router.push('/assets')} />
            <MenuItem icon="wallet-outline" label="Rendimentos" tc={tc} onPress={() => router.push('/income-sources')} />
            <MenuItem icon="receipt-outline" label="Contas a Pagar" tc={tc} onPress={() => router.push('/bills')} />
            <MenuItem icon="repeat-outline" label="Recorrentes" tc={tc} onPress={() => router.push('/recurring-rules')} isLast />
          </View>
        </View>

        {/* Section: Mais — different items for personal vs family */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: tc.textSecondary }]}>{isFamily ? 'FAMILIA' : 'MAIS'}</Text>
          <View style={[styles.sectionCard, { backgroundColor: tc.card }]}>
            {isFamily ? (
              <>
                <MenuItem icon="people-outline" label="Membros" tc={tc} onPress={() => router.push('/family/members')} />
                <MenuItem icon="git-compare-outline" label="Divisao de despesas" tc={tc} onPress={() => router.push('/family/expense-splits')} />
                <MenuItem icon="bar-chart-outline" label="Relatorios" tc={tc} onPress={() => router.push('/(tabs)/reports')} />
                <MenuItem icon="notifications-outline" label="Notificacoes" tc={tc} onPress={() => router.push('/notifications')} isLast />
              </>
            ) : (
              <>
                <MenuItem icon="newspaper-outline" label="Noticias" tc={tc} onPress={() => router.push('/news')} />
                <MenuItem icon="school-outline" label="Educacao" tc={tc} onPress={() => router.push('/education')} />
                <MenuItem icon="notifications-outline" label="Notificacoes" tc={tc} onPress={() => router.push('/notifications')} isLast />
              </>
            )}
          </View>
        </View>

        {/* Footer: Theme + Logout */}
        <View style={[styles.footerCard, { backgroundColor: tc.card }]}>
          <Pressable style={[styles.footerRow, { borderBottomColor: tc.borderLight }]} onPress={cycleTheme}>
            <Ionicons name={THEME_ICONS[themeMode] as any} size={20} color={tc.icon} />
            <Text style={[styles.footerLabel, { color: tc.text }]}>
              Tema: {THEME_LABELS[themeMode]}
            </Text>
          </Pressable>
          <Pressable style={styles.footerRowLast} onPress={logout}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={[styles.footerLabel, { color: colors.error }]}>
              Terminar sessao
            </Text>
          </Pressable>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

function MenuItem({
  icon,
  label,
  tc,
  onPress,
  isLast,
}: {
  icon: string
  label: string
  tc: ReturnType<typeof themeColors>
  onPress?: () => void
  isLast?: boolean
}) {
  return (
    <Pressable
      style={[
        styles.menuRow,
        !isLast && { borderBottomWidth: 0.5, borderBottomColor: tc.borderLight },
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon as any} size={20} color={tc.icon} />
      <Text style={[styles.menuLabel, { color: tc.text }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={tc.handle} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },

  // Profile
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700' },
  profileInfo: { flex: 1, marginLeft: 12 },
  profileName: { fontSize: 16, fontWeight: '600' },
  profilePhone: { fontSize: 13, marginTop: 2 },

  // Context — horizontal toggle (with family)
  contextToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  contextToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  contextToggleLabel: { fontSize: 14, fontWeight: '600' },

  // Context — vertical card (no family)
  contextCard: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
  },
  contextOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 0.5,
  },
  contextOptionLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  contextActions: {
    borderTopWidth: 0.5,
    paddingTop: 2,
  },
  contextActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  contextActionLabel: { fontSize: 14, fontWeight: '500' },
  contextForm: {
    borderTopWidth: 0.5,
    padding: 12,
    gap: 10,
  },
  contextInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  contextFormRow: {
    flexDirection: 'row',
    gap: 8,
  },
  contextFormBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  contextFormBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  contextFormCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  contextFormCancelText: { fontSize: 14 },

  // Sections
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  sectionCard: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuLabel: { flex: 1, fontSize: 15, marginLeft: 12 },

  // Footer
  footerCard: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  footerRowLast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  footerLabel: { fontSize: 15, marginLeft: 12 },
})
