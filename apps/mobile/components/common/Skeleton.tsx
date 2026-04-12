import { useEffect } from 'react'
import { StyleSheet, ViewStyle, useColorScheme } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated'

interface Props {
  width?: number | `${number}%`
  height?: number
  borderRadius?: number
  style?: ViewStyle
}

/**
 * Shimmer skeleton placeholder for loading states.
 */
export default function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: Props) {
  const isDark = useColorScheme() === 'dark'
  const opacity = useSharedValue(0.3)

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    )
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: isDark ? '#333' : '#e5e5e5',
        },
        animatedStyle,
        style,
      ]}
    />
  )
}

export function SkeletonCard() {
  return (
    <Animated.View style={skeletonStyles.card}>
      <Skeleton width="40%" height={14} />
      <Skeleton width="60%" height={24} style={{ marginTop: 8 }} />
      <Skeleton width="80%" height={12} style={{ marginTop: 12 }} />
    </Animated.View>
  )
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Animated.View key={i} style={skeletonStyles.row}>
          <Skeleton width={40} height={40} borderRadius={20} />
          <Animated.View style={skeletonStyles.rowText}>
            <Skeleton width="70%" height={14} />
            <Skeleton width="40%" height={10} style={{ marginTop: 6 }} />
          </Animated.View>
          <Skeleton width={80} height={16} />
        </Animated.View>
      ))}
    </>
  )
}

const skeletonStyles = StyleSheet.create({
  card: { padding: 20, borderRadius: 16, marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowText: { flex: 1 },
})
