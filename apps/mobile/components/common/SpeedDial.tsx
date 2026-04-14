import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

import { colors, themeColors } from '../../lib/tokens'

export interface SpeedDialAction {
  key: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
  color?: string
}

interface Props {
  actions: SpeedDialAction[]
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

/**
 * Speed Dial FAB — expandable floating action button.
 * Tap to reveal a vertical stack of secondary actions with labels.
 * Tap again (or backdrop) to collapse.
 */
export default function SpeedDial({ actions }: Props) {
  const isDark = useColorScheme() === 'dark'
  const tc = themeColors(isDark)
  const [open, setOpen] = useState(false)

  const mainScale = useSharedValue(0)
  const rotation = useSharedValue(0)
  const backdropOpacity = useSharedValue(0)

  useEffect(() => {
    mainScale.value = withSpring(1, { damping: 12, stiffness: 120 })
  }, [])

  useEffect(() => {
    rotation.value = withTiming(open ? 45 : 0, { duration: 200, easing: Easing.out(Easing.ease) })
    backdropOpacity.value = withTiming(open ? 1 : 0, { duration: 200 })
  }, [open])

  const mainBtnAnim = useAnimatedStyle(() => ({
    transform: [{ scale: mainScale.value }, { rotate: `${rotation.value}deg` }],
  }))

  const backdropAnim = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
    // Make non-interactive when closed so taps pass through
    pointerEvents: backdropOpacity.value > 0 ? ('auto' as const) : ('none' as const),
  }))

  const handleMainPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setOpen((v) => !v)
  }

  const handleActionPress = (action: SpeedDialAction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setOpen(false)
    // Small delay so the collapse animation starts before the sheet opens
    setTimeout(() => action.onPress(), 120)
  }

  const mainBg = isDark ? colors.dark.text : colors.light.text
  const mainIconColor = isDark ? colors.dark.bg : colors.light.bg

  return (
    <>
      {/* Backdrop — captures taps to close when open */}
      <Animated.View
        style={[styles.backdrop, backdropAnim]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
      </Animated.View>

      {/* Action items — stacked above the main FAB when open */}
      {actions.map((action, i) => (
        <ActionItem
          key={action.key}
          action={action}
          index={i}
          open={open}
          tc={tc}
          onPress={() => handleActionPress(action)}
        />
      ))}

      {/* Main FAB */}
      <AnimatedPressable
        style={[styles.fab, { backgroundColor: mainBg }, mainBtnAnim]}
        onPress={handleMainPress}
      >
        <Ionicons name="add" size={28} color={mainIconColor} />
      </AnimatedPressable>
    </>
  )
}

interface ActionItemProps {
  action: SpeedDialAction
  index: number
  open: boolean
  tc: ReturnType<typeof themeColors>
  onPress: () => void
}

function ActionItem({ action, index, open, tc, onPress }: ActionItemProps) {
  const translateY = useSharedValue(0)
  const opacity = useSharedValue(0)

  // Each action sits at a different distance from the main FAB.
  // i=0 is closest, i=1 further, etc. Distance = 64 * (index + 1)
  const distance = 64 * (index + 1)

  useEffect(() => {
    if (open) {
      // Stagger: later items appear slightly after earlier ones
      const delay = index * 40
      translateY.value = withTiming(-distance, {
        duration: 220,
        easing: Easing.out(Easing.ease),
      })
      opacity.value = withTiming(1, { duration: 180 })
    } else {
      translateY.value = withTiming(0, { duration: 160, easing: Easing.in(Easing.ease) })
      opacity.value = withTiming(0, { duration: 120 })
    }
  }, [open, distance, index])

  const anim = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }))

  const bg = action.color || tc.card
  const iconColor = action.color ? '#FFFFFF' : colors.primary

  return (
    <Animated.View style={[styles.actionWrap, anim]} pointerEvents={open ? 'auto' : 'none'}>
      <View style={[styles.actionLabel, { backgroundColor: tc.card }]}>
        <Text style={[styles.actionLabelText, { color: tc.text }]}>{action.label}</Text>
      </View>
      <Pressable
        style={[styles.actionBtn, { backgroundColor: bg }]}
        onPress={onPress}
      >
        <Ionicons name={action.icon} size={20} color={iconColor} />
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 90,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 100,
  },
  actionWrap: {
    position: 'absolute',
    bottom: 24 + (56 - 44) / 2, // align action center with main FAB center
    right: 20 + (56 - 44) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 95,
  },
  actionLabel: {
    position: 'absolute',
    right: 44 + 12, // to the left of the action button
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  actionLabelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
})
