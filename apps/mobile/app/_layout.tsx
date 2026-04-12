import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { useColorScheme } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import 'react-native-reanimated'

import { loadContext } from '../lib/context'
import { useAuthStore } from '../stores/auth'

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

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/login')
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)')
    }
  }, [isAuthenticated, isCheckingAuth, segments])
}

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const checkAuth = useAuthStore((s) => s.checkAuth)
  const isCheckingAuth = useAuthStore((s) => s.isCheckingAuth)

  useEffect(() => {
    Promise.all([checkAuth(), loadContext()]).finally(() => {
      SplashScreen.hideAsync()
    })
  }, [])

  useProtectedRoute()

  if (isCheckingAuth) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="(tabs)" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}
