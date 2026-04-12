import { useEffect } from 'react'
import { ViewProps } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated'

interface Props extends ViewProps {
  delay?: number
  duration?: number
  slideUp?: number
  children: React.ReactNode
}

/**
 * Fades in children with optional slide-up effect.
 * Use for cards, sections, and content that loads dynamically.
 */
export default function FadeInView({
  delay = 0,
  duration = 400,
  slideUp = 12,
  style,
  children,
  ...rest
}: Props) {
  const opacity = useSharedValue(0)
  const translateY = useSharedValue(slideUp)

  useEffect(() => {
    const timeout = setTimeout(() => {
      opacity.value = withTiming(1, { duration, easing: Easing.out(Easing.ease) })
      translateY.value = withTiming(0, { duration, easing: Easing.out(Easing.ease) })
    }, delay)
    return () => clearTimeout(timeout)
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  return (
    <Animated.View style={[animatedStyle, style]} {...rest}>
      {children}
    </Animated.View>
  )
}
