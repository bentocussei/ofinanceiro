import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native'

export interface FilterState {
  type: 'all' | 'expense' | 'income' | 'transfer'
  period: 'week' | 'month' | '3months' | 'year' | 'all'
}

interface Props {
  filters: FilterState
  onChange: (filters: FilterState) => void
}

const TYPE_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'expense', label: 'Despesas' },
  { value: 'income', label: 'Receitas' },
  { value: 'transfer', label: 'Transf.' },
] as const

const PERIOD_OPTIONS = [
  { value: 'week', label: '7 dias' },
  { value: 'month', label: 'Mês' },
  { value: '3months', label: '3 meses' },
  { value: 'year', label: 'Ano' },
  { value: 'all', label: 'Tudo' },
] as const

export default function TransactionFilters({ filters, onChange }: Props) {
  const isDark = useColorScheme() === 'dark'

  return (
    <View style={styles.container}>
      {/* Type filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {TYPE_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[
              styles.chip,
              isDark && styles.chipDark,
              filters.type === opt.value && styles.chipActive,
            ]}
            onPress={() => onChange({ ...filters, type: opt.value })}
          >
            <Text
              style={[
                styles.chipText,
                isDark && styles.chipTextDark,
                filters.type === opt.value && styles.chipTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}

        <View style={styles.separator} />

        {/* Period filter */}
        {PERIOD_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[
              styles.chip,
              isDark && styles.chipDark,
              filters.period === opt.value && styles.chipActive,
            ]}
            onPress={() => onChange({ ...filters, period: opt.value })}
          >
            <Text
              style={[
                styles.chipText,
                isDark && styles.chipTextDark,
                filters.period === opt.value && styles.chipTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { paddingVertical: 8 },
  row: { paddingHorizontal: 16, gap: 6, alignItems: 'center' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  chipDark: { borderColor: '#333', backgroundColor: '#1a1a1a' },
  chipActive: { backgroundColor: '#000', borderColor: '#000' },
  chipText: { fontSize: 13, color: '#666' },
  chipTextDark: { color: '#999' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  separator: { width: 1, height: 20, backgroundColor: '#e5e5e5', marginHorizontal: 4 },
})
