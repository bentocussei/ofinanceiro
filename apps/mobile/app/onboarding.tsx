import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useState, useRef } from 'react'
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as SecureStore from 'expo-secure-store'

import { colors, themeColors } from '../lib/tokens'

const { width } = Dimensions.get('window')

interface Step {
  icon: string
  title: string
  description: string
  color: string
}

const STEPS: Step[] = [
  {
    icon: 'wallet-outline',
    title: 'Controla as tuas financas',
    description: 'Regista receitas e despesas de forma rapida. Organiza por categorias pensadas para Angola.',
    color: colors.primary,
  },
  {
    icon: 'chatbubble-ellipses-outline',
    title: 'Assistente inteligente',
    description: 'Fala com o assistente para registar transaccoes, consultar saldos e receber conselhos financeiros.',
    color: colors.purple,
  },
  {
    icon: 'people-outline',
    title: 'Financas familiares',
    description: 'Gere o orcamento da familia em conjunto. Cada membro controla os seus gastos.',
    color: colors.warning,
  },
  {
    icon: 'bar-chart-outline',
    title: 'Relatorios e metas',
    description: 'Acompanha os teus gastos com graficos. Define metas de poupanca e controla dividas.',
    color: colors.success,
  },
]

const ONBOARDING_KEY = 'onboarding_completed'

export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(ONBOARDING_KEY)) === 'true'
  } catch {
    return false
  }
}

export async function markOnboardingComplete(): Promise<void> {
  await SecureStore.setItemAsync(ONBOARDING_KEY, 'true')
}

export default function OnboardingScreen() {
  const isDark = useColorScheme() === 'dark'
  const router = useRouter()
  const flatListRef = useRef<FlatList>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  const tc = themeColors(isDark)
  const bg = isDark ? '#000' : '#fff'
  const text = tc.text
  const muted = tc.textSecondary

  async function handleFinish() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    await markOnboardingComplete()
    router.replace('/(tabs)')
  }

  function handleNext() {
    if (currentIndex < STEPS.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 })
      setCurrentIndex(currentIndex + 1)
    } else {
      handleFinish()
    }
  }

  function handleSkip() {
    handleFinish()
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      {/* Skip button */}
      <View style={styles.topBar}>
        <View />
        <Pressable onPress={handleSkip}>
          <Text style={[styles.skipText, { color: muted }]}>Saltar</Text>
        </Pressable>
      </View>

      {/* Steps */}
      <FlatList
        ref={flatListRef}
        data={STEPS}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width)
          setCurrentIndex(index)
        }}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={[styles.step, { width }]}>
            <View style={[styles.iconCircle, { backgroundColor: item.color + '15' }]}>
              <Ionicons name={item.icon as any} size={60} color={item.color} />
            </View>
            <Text style={[styles.stepTitle, { color: text }]}>{item.title}</Text>
            <Text style={[styles.stepDesc, { color: muted }]}>{item.description}</Text>
          </View>
        )}
      />

      {/* Dots + Button */}
      <View style={styles.bottom}>
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === currentIndex ? text : (isDark ? '#333' : '#ddd') },
              ]}
            />
          ))}
        </View>

        <Pressable
          style={[styles.nextBtn, { backgroundColor: text }]}
          onPress={handleNext}
        >
          <Text style={[styles.nextText, { color: isDark ? '#000' : '#fff' }]}>
            {currentIndex === STEPS.length - 1 ? 'Comecar' : 'Proximo'}
          </Text>
          <Ionicons
            name={currentIndex === STEPS.length - 1 ? 'checkmark' : 'arrow-forward'}
            size={20}
            color={isDark ? '#000' : '#fff'}
          />
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  skipText: { fontSize: 15, fontWeight: '500' },
  step: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  stepTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  stepDesc: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  bottom: { paddingHorizontal: 20, paddingBottom: 20 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 16,
  },
  nextText: { fontSize: 16, fontWeight: '600' },
})
