import * as Haptics from 'expo-haptics'
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native'

import { colors, themeColors } from '../../lib/tokens'

interface Props {
  value: string
  onChange: (value: string) => void
  currency?: string
}

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', '⌫'],
]

export default function AmountInput({ value, onChange, currency = 'Kz' }: Props) {
  const isDark = useColorScheme() === 'dark'

  const handlePress = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    if (key === '⌫') {
      onChange(value.slice(0, -1))
      return
    }

    if (key === '.' && value.includes('.')) return
    if (key === '.' && value === '') {
      onChange('0.')
      return
    }

    // Max 10 digits before decimal, 2 after
    const parts = (value + key).split('.')
    if (parts[0].length > 10) return
    if (parts[1] && parts[1].length > 2) return

    onChange(value + key)
  }

  const handleLongPress = (key: string) => {
    if (key === '⌫') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      onChange('')
    }
  }

  // Format display value
  const displayValue = value || '0'
  const numericValue = parseFloat(displayValue) || 0
  const formatted = new Intl.NumberFormat('pt-AO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(numericValue)

  return (
    <View>
      {/* Display */}
      <View style={styles.display}>
        <Text style={[styles.amount, isDark && styles.amountDark]}>
          {formatted}
        </Text>
        <Text style={[styles.currency, isDark && styles.currencyDark]}>{currency}</Text>
      </View>

      {/* Keypad */}
      <View style={styles.keypad}>
        {KEYS.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((key) => (
              <Pressable
                key={key}
                style={({ pressed }) => [
                  styles.key,
                  isDark && styles.keyDark,
                  pressed && styles.keyPressed,
                  key === '⌫' && styles.keyBackspace,
                ]}
                onPress={() => handlePress(key)}
                onLongPress={() => handleLongPress(key)}
              >
                <Text
                  style={[
                    styles.keyText,
                    isDark && styles.keyTextDark,
                    key === '⌫' && styles.keyTextBackspace,
                  ]}
                >
                  {key}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  display: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  amount: {
    fontSize: 40,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: colors.light.text,
  },
  amountDark: { color: colors.dark.text },
  currency: { fontSize: 18, color: colors.light.textMuted, fontWeight: '500' },
  currencyDark: { color: colors.dark.textMuted },
  keypad: { gap: 8, paddingHorizontal: 16 },
  row: { flexDirection: 'row', gap: 8 },
  key: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.light.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyDark: { backgroundColor: colors.dark.borderLight },
  keyPressed: { backgroundColor: colors.light.border },
  keyBackspace: { backgroundColor: 'transparent' },
  keyText: {
    fontSize: 22,
    fontWeight: '500',
    color: colors.light.text,
  },
  keyTextDark: { color: colors.dark.text },
  keyTextBackspace: { fontSize: 24 },
})
