import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useEffect } from 'react'
import { Pressable, StyleSheet, useColorScheme } from 'react-native'

import { colors, themeColors } from '../../lib/tokens'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

interface Props {
  onPress: () => void
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export default function FAB({ onPress }: Props) {
  const isDark = useColorScheme() === 'dark'
  const scale = useSharedValue(0)

  useEffect(() => {
    // Animate in on mount
    scale.value = withSpring(1, { damping: 12, stiffness: 120 })
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePressIn = () => {
    scale.value = withTiming(0.9, { duration: 100 })
  }

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 120 })
  }

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onPress()
  }

  return (
    <AnimatedPressable
      style={[styles.fab, animatedStyle, isDark && styles.fabDark]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Ionicons name="add" size={28} color={isDark ? colors.light.text : colors.dark.text} />
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.light.text,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.light.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 100,
  },
  fabDark: {
    backgroundColor: colors.dark.text,
  },
})
