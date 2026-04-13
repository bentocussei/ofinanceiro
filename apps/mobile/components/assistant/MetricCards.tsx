import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, Text, View, useColorScheme } from 'react-native'

import { colors, themeColors } from '../../lib/tokens'

export interface MetricConfig {
  label: string
  value: number
  format?: 'currency' | 'percentage' | 'number'
  trend?: 'up' | 'down' | 'neutral'
  percentage?: number
}

function formatValue(value: number, format?: string): string {
  switch (format) {
    case 'currency':
      return Intl.NumberFormat('pt-AO').format(Math.round(value / 100)) + ' Kz'
    case 'percentage':
      return Math.round(value * 10) / 10 + '%'
    default:
      return Intl.NumberFormat('pt-AO').format(Math.round(value))
  }
}

function getProgressColor(percentage: number): string {
  if (percentage >= 90) return colors.error
  if (percentage >= 70) return colors.warning
  return colors.success
}

function TrendIcon({ trend, tc }: { trend?: string; tc: ReturnType<typeof themeColors> }) {
  if (trend === 'up') {
    return <Ionicons name="arrow-up" size={14} color={colors.success} />
  }
  if (trend === 'down') {
    return <Ionicons name="arrow-down" size={14} color={colors.error} />
  }
  if (trend === 'neutral') {
    return <Ionicons name="remove-outline" size={14} color={tc.textMuted} />
  }
  return null
}

interface MetricCardsProps {
  data: MetricConfig[]
}

export default function MetricCards({ data }: MetricCardsProps) {
  const isDark = useColorScheme() === 'dark'
  const tc = themeColors(isDark)

  return (
    <View style={styles.grid}>
      {data.map((item, index) => (
        <View key={index} style={[styles.card, { backgroundColor: tc.cardAlt }]}>
          <Text style={[styles.label, { color: tc.textSecondary }]} numberOfLines={1}>
            {item.label}
          </Text>
          <View style={styles.valueRow}>
            <Text style={[styles.value, { color: tc.text }]} numberOfLines={1}>
              {formatValue(item.value, item.format)}
            </Text>
            <TrendIcon trend={item.trend} tc={tc} />
          </View>
          {item.percentage != null && (
            <View style={[styles.progressTrack, { backgroundColor: tc.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: getProgressColor(item.percentage),
                    width: `${Math.min(item.percentage, 100)}%`,
                  },
                ]}
              />
            </View>
          )}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  card: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '46%',
    borderRadius: 12,
    padding: 12,
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'monospace',
    flexShrink: 1,
  },
  progressTrack: {
    height: 2,
    width: '100%',
    borderRadius: 1,
    marginTop: 8,
  },
  progressFill: {
    height: 2,
    borderRadius: 1,
  },
})
