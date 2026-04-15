import React from 'react'
import { StyleSheet, Text, View, useColorScheme } from 'react-native'
import Svg, { Line, Path, Polyline, Rect, Text as SvgText } from 'react-native-svg'

import { themeColors } from '../../lib/tokens'

const CHART_PALETTE = [
  '#0D9488',
  '#D97706',
  '#2563EB',
  '#7C3AED',
  '#15803D',
  '#EA580C',
  '#DB2777',
  '#B91C1C',
]

export interface InlineChartProps {
  type: 'bar' | 'horizontal_bar' | 'doughnut' | 'pie' | 'line' | 'area'
  title?: string
  labels: string[]
  values: number[]
  values2?: number[]
  label1?: string
  label2?: string
  format?: 'currency' | 'percentage' | 'number'
}

function formatChartValue(value: number, format?: string): string {
  switch (format) {
    case 'currency':
      return Intl.NumberFormat('pt-AO').format(Math.round(value / 100)) + ' Kz'
    case 'percentage':
      return Math.round(value * 10) / 10 + '%'
    default:
      return Intl.NumberFormat('pt-AO').format(Math.round(value))
  }
}

// --- Bar Chart ---
function BarChart({
  labels,
  values,
  format,
  tc,
}: {
  labels: string[]
  values: number[]
  format?: string
  tc: ReturnType<typeof themeColors>
}) {
  const maxVal = Math.max(...values, 1)
  const chartHeight = 150
  const barWidth = 30
  const gap = 12
  const totalWidth = labels.length * (barWidth + gap) - gap
  const svgWidth = Math.max(totalWidth + 20, 200)
  const offsetX = 10

  return (
    <Svg width="100%" height={chartHeight + 30} viewBox={`0 0 ${svgWidth} ${chartHeight + 30}`}>
      {values.map((v, i) => {
        const barHeight = (v / maxVal) * (chartHeight - 10)
        const x = offsetX + i * (barWidth + gap)
        const y = chartHeight - barHeight
        return (
          <React.Fragment key={i}>
            <Rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={4}
              fill={CHART_PALETTE[i % CHART_PALETTE.length]}
            />
            <SvgText
              x={x + barWidth / 2}
              y={chartHeight + 14}
              fontSize={9}
              fill={tc.textSecondary}
              textAnchor="middle"
            >
              {labels[i]?.length > 8 ? labels[i].substring(0, 7) + '..' : labels[i]}
            </SvgText>
          </React.Fragment>
        )
      })}
    </Svg>
  )
}

// --- Horizontal Bar Chart ---
function HorizontalBarChart({
  labels,
  values,
  format,
  tc,
}: {
  labels: string[]
  values: number[]
  format?: string
  tc: ReturnType<typeof themeColors>
}) {
  const maxVal = Math.max(...values, 1)
  const barHeight = 20
  const gap = 8
  const labelWidth = 80
  const chartWidth = 220
  const svgHeight = labels.length * (barHeight + gap)

  return (
    <Svg width="100%" height={svgHeight} viewBox={`0 0 ${labelWidth + chartWidth + 10} ${svgHeight}`}>
      {values.map((v, i) => {
        const bw = (v / maxVal) * chartWidth
        const y = i * (barHeight + gap)
        return (
          <React.Fragment key={i}>
            <SvgText
              x={labelWidth - 4}
              y={y + barHeight / 2 + 4}
              fontSize={10}
              fill={tc.textSecondary}
              textAnchor="end"
            >
              {labels[i]?.length > 12 ? labels[i].substring(0, 11) + '..' : labels[i]}
            </SvgText>
            <Rect
              x={labelWidth}
              y={y}
              width={Math.max(bw, 2)}
              height={barHeight}
              rx={4}
              fill={CHART_PALETTE[i % CHART_PALETTE.length]}
            />
          </React.Fragment>
        )
      })}
    </Svg>
  )
}

// --- Doughnut / Pie Chart ---
function DoughnutChart({
  labels,
  values,
  tc,
  isPie,
}: {
  labels: string[]
  values: number[]
  tc: ReturnType<typeof themeColors>
  isPie?: boolean
}) {
  const total = values.reduce((a, b) => a + b, 0) || 1
  const size = 180
  const cx = size / 2
  const cy = size / 2
  const outerR = size / 2 - 4
  const innerR = isPie ? 0 : outerR * 0.55

  let startAngle = -Math.PI / 2
  const paths: { d: string; color: string }[] = []

  values.forEach((v, i) => {
    const fraction = v / total
    const angle = fraction * 2 * Math.PI
    const endAngle = startAngle + angle
    const largeArc = angle > Math.PI ? 1 : 0

    const x1 = cx + outerR * Math.cos(startAngle)
    const y1 = cy + outerR * Math.sin(startAngle)
    const x2 = cx + outerR * Math.cos(endAngle)
    const y2 = cy + outerR * Math.sin(endAngle)

    let d: string
    if (innerR > 0) {
      const ix1 = cx + innerR * Math.cos(endAngle)
      const iy1 = cy + innerR * Math.sin(endAngle)
      const ix2 = cx + innerR * Math.cos(startAngle)
      const iy2 = cy + innerR * Math.sin(startAngle)
      d = `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`
    } else {
      d = `M ${cx} ${cy} L ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} Z`
    }

    paths.push({ d, color: CHART_PALETTE[i % CHART_PALETTE.length] })
    startAngle = endAngle
  })

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths.map((p, i) => (
          <Path key={i} d={p.d} fill={p.color} />
        ))}
      </Svg>
    </View>
  )
}

// --- Line / Área Chart ---
function LineChart({
  labels,
  values,
  values2,
  format,
  tc,
  isArea,
}: {
  labels: string[]
  values: number[]
  values2?: number[]
  format?: string
  tc: ReturnType<typeof themeColors>
  isArea?: boolean
}) {
  const allVals = [...values, ...(values2 || [])]
  const maxVal = Math.max(...allVals, 1)
  const minVal = Math.min(...allVals, 0)
  const range = maxVal - minVal || 1
  const chartHeight = 150
  const chartWidth = 300
  const padX = 10
  const padY = 10

  const toPoint = (vals: number[]) =>
    vals.map((v, i) => {
      const x = padX + (i / Math.max(vals.length - 1, 1)) * (chartWidth - 2 * padX)
      const y = padY + (1 - (v - minVal) / range) * (chartHeight - 2 * padY)
      return `${x},${y}`
    })

  const points1 = toPoint(values)
  const polyline1 = points1.join(' ')

  const areaPath1 = isArea
    ? `M ${padX},${chartHeight - padY} L ${polyline1.replace(/ /g, ' L ')} L ${padX + ((values.length - 1) / Math.max(values.length - 1, 1)) * (chartWidth - 2 * padX)},${chartHeight - padY} Z`
    : undefined

  const points2 = values2 ? toPoint(values2) : undefined
  const polyline2 = points2?.join(' ')

  return (
    <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
      {/* baseline */}
      <Line
        x1={padX}
        y1={chartHeight - padY}
        x2={chartWidth - padX}
        y2={chartHeight - padY}
        stroke={tc.border}
        strokeWidth={0.5}
      />
      {isArea && areaPath1 && (
        <Path d={areaPath1} fill={CHART_PALETTE[0]} opacity={0.15} />
      )}
      <Polyline
        points={polyline1}
        fill="none"
        stroke={CHART_PALETTE[0]}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {polyline2 && (
        <Polyline
          points={polyline2}
          fill="none"
          stroke={CHART_PALETTE[1]}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeDasharray="4,4"
        />
      )}
      {/* x-axis labels */}
      {labels.map((label, i) => {
        const x = padX + (i / Math.max(labels.length - 1, 1)) * (chartWidth - 2 * padX)
        // Only show a subset of labels if too many
        if (labels.length > 6 && i % Math.ceil(labels.length / 6) !== 0 && i !== labels.length - 1) {
          return null
        }
        return (
          <SvgText
            key={i}
            x={x}
            y={chartHeight - 1}
            fontSize={8}
            fill={tc.textSecondary}
            textAnchor="middle"
          >
            {label.length > 6 ? label.substring(0, 5) + '..' : label}
          </SvgText>
        )
      })}
    </Svg>
  )
}

// --- Legend ---
function Legend({
  labels,
  values,
  format,
  tc,
}: {
  labels: string[]
  values: number[]
  format?: string
  tc: ReturnType<typeof themeColors>
}) {
  return (
    <View style={styles.legend}>
      {labels.map((label, i) => (
        <View key={i} style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: CHART_PALETTE[i % CHART_PALETTE.length] }]}
          />
          <Text style={[styles.legendLabel, { color: tc.textSecondary }]} numberOfLines={1}>
            {label}
          </Text>
          <Text style={[styles.legendValue, { color: tc.text }]}>
            {formatChartValue(values[i], format)}
          </Text>
        </View>
      ))}
    </View>
  )
}

// --- Main Component ---

export default function InlineChart({
  type,
  title,
  labels,
  values,
  values2,
  label1,
  label2,
  format,
}: InlineChartProps) {
  const isDark = useColorScheme() === 'dark'
  const tc = themeColors(isDark)

  if (!labels?.length || !values?.length) return null

  return (
    <View style={[styles.container, { backgroundColor: tc.cardAlt, borderColor: tc.border }]}>
      {title ? (
        <Text style={[styles.title, { color: tc.text }]}>{title}</Text>
      ) : null}

      {type === 'bar' && <BarChart labels={labels} values={values} format={format} tc={tc} />}
      {type === 'horizontal_bar' && (
        <HorizontalBarChart labels={labels} values={values} format={format} tc={tc} />
      )}
      {(type === 'doughnut' || type === 'pie') && (
        <DoughnutChart labels={labels} values={values} tc={tc} isPie={type === 'pie'} />
      )}
      {(type === 'line' || type === 'area') && (
        <LineChart
          labels={labels}
          values={values}
          values2={values2}
          format={format}
          tc={tc}
          isArea={type === 'area'}
        />
      )}

      <Legend labels={labels} values={values} format={format} tc={tc} />

      {values2 && label1 && label2 && (
        <View style={styles.seriesLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: CHART_PALETTE[0] }]} />
            <Text style={[styles.legendLabel, { color: tc.textSecondary }]}>{label1}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: CHART_PALETTE[1] }]} />
            <Text style={[styles.legendLabel, { color: tc.textSecondary }]}>{label2}</Text>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  legend: {
    marginTop: 8,
    gap: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    flex: 1,
  },
  legendValue: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  seriesLegend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#ddd',
  },
})
