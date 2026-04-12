import { useCallback } from 'react'
import { Pressable, PressableProps } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

const AnimatedPress = Animated.createAnimatedComponent(Pressable)

interface Props extends PressableProps {
  scaleDown?: number
  children: React.ReactNode
}

/**
 * Pressable with subtle scale-down animation on press.
 * Use instead of plain Pressable for interactive cards/buttons.
 */
export default function AnimatedPressable({
  scaleDown = 0.97,
  style,
  children,
  ...rest
}: Props) {
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(scaleDown, { duration: 100 })
  }, [scaleDown])

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 })
  }, [])

  return (
    <AnimatedPress
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, style as any]}
      {...rest}
    >
      {children}
    </AnimatedPress>
  )
}
