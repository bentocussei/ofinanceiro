import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { useColorScheme } from 'react-native'

export default function TabLayout() {
  const colorScheme = useColorScheme()
  const tint = colorScheme === 'dark' ? '#fff' : '#000'
  const inactive = colorScheme === 'dark' ? '#666' : '#999'

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tint,
        tabBarInactiveTintColor: inactive,
        tabBarStyle: {
          borderTopWidth: 0.5,
          borderTopColor: colorScheme === 'dark' ? '#333' : '#e5e5e5',
        },
        headerShown: false,
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
