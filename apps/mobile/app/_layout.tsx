import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { useColorScheme } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import 'react-native-reanimated'

import { isBiometricEnabled, authenticate } from '../lib/biometrics'
import { loadContext } from '../lib/context'
import { registerForPushNotifications } from '../lib/pushNotifications'
import { useAuthStore } from '../stores/auth'
import { hasCompletedOnboarding } from './onboarding'

export { ErrorBoundary } from 'expo-router'

SplashScreen.preventAutoHideAsync()

function useProtectedRoute() {
  const router = useRouter()
  const segments = useSegments()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isCheckingAuth = useAuthStore((s) => s.isCheckingAuth)

  useEffect(() => {
    if (isCheckingAuth) return

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'register'
    const inOnboarding = segments[0] === 'onboarding'

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/login')
    } else if (isAuthenticated && inAuthGroup && !inOnboarding) {
      // Check onboarding
      hasCompletedOnboarding().then((done) => {
        if (done) {
          router.replace('/(tabs)')
        } else {
          router.replace('/onboarding')
        }
      })
    }
  }, [isAuthenticated, isCheckingAuth, segments])
}

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const checkAuth = useAuthStore((s) => s.checkAuth)
  const isCheckingAuth = useAuthStore((s) => s.isCheckingAuth)

  useEffect(() => {
    async function init() {
      await Promise.all([checkAuth(), loadContext()])

      // Biometric check after auth
      const isAuth = useAuthStore.getState().isAuthenticated
      if (isAuth) {
        const bioEnabled = await isBiometricEnabled()
        if (bioEnabled) {
          const success = await authenticate('Autentique-se para abrir O Financeiro')
          if (!success) {
            // User failed biometric — log them out
            useAuthStore.getState().logout()
          }
        }
        // Register push notifications in background
        registerForPushNotifications().catch(() => {})
      }

      SplashScreen.hideAsync()
    }
    init()
  }, [])

  useProtectedRoute()

  if (isCheckingAuth) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: 250,
          }}
        >
          <Stack.Screen name="login" options={{ animation: 'fade' }} />
          <Stack.Screen name="register" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}
