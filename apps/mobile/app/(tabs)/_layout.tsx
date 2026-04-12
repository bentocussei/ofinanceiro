import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { Platform, useColorScheme } from 'react-native'

export default function TabLayout() {
  const colorScheme = useColorScheme()
  const tint = colorScheme === 'dark' ? '#fff' : '#000'
  const inactive = colorScheme === 'dark' ? '#555' : '#aaa'
  const bg = colorScheme === 'dark' ? '#000' : '#fff'

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tint,
        tabBarInactiveTintColor: inactive,
        tabBarStyle: {
          backgroundColor: bg,
          borderTopWidth: 0.5,
          borderTopColor: colorScheme === 'dark' ? '#222' : '#e5e5e5',
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 84 : 64,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
        headerShown: false,
        animation: 'shift',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: 'Contas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Assistente',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transacções',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="swap-vertical-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Mais',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="menu-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Reports moved to More menu */}
      <Tabs.Screen name="reports" options={{ href: null }} />
    </Tabs>
  )
}
