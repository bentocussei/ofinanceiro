import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { FamilyMember, useFamilyStore } from '../../stores/family'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  adult: 'Adulto',
  dependent: 'Dependente',
}

export default function FamilyScreen() {
  const isDark = useColorScheme() === 'dark'
  const router = useRouter()
  const { family, isLoading, fetchFamily, createFamily, joinFamily, removeMember, updateMemberRole } =
    useFamilyStore()
  const [createName, setCreateName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)

  useEffect(() => { fetchFamily() }, [])
  const onRefresh = useCallback(() => fetchFamily(), [])

  const handleCreate = async () => {
    if (!createName.trim()) return
    try {
      await createFamily(createName.trim())
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setShowCreate(false)
      setCreateName('')
    } catch (e: any) {
      Alert.alert('Erro', e.message)
    }
  }

  const handleJoin = async () => {
    if (!joinCode.trim()) return
    try {
      await joinFamily(joinCode.trim())
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setShowJoin(false)
      setJoinCode('')
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Código inválido')
    }
  }

  const handleCopyCode = async () => {
    if (family?.invite_code) {
      await Clipboard.setStringAsync(family.invite_code)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert('Copiado', 'Código de convite copiado')
    }
  }

  const handleMemberAction = (member: FamilyMember) => {
    if (member.role === 'admin') return
    Alert.alert(member.display_name || 'Membro', ROLE_LABELS[member.role], [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: member.role === 'adult' ? 'Tornar dependente' : 'Tornar adulto',
        onPress: () => updateMemberRole(member.id, member.role === 'adult' ? 'dependent' : 'adult'),
      },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Confirmar', 'Remover este membro?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Remover', style: 'destructive', onPress: () => removeMember(member.id) },
          ])
        },
      },
    ])
  }

  // No family yet — show create/join
  if (!family) {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
          </Pressable>
          <Text style={[styles.title, isDark && styles.textLight]}>Família</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.noFamily}>
          <Ionicons name="people-outline" size={64} color={isDark ? '#444' : '#ddd'} />
          <Text style={[styles.noFamilyTitle, isDark && styles.textLight]}>
            Sem agregado familiar
          </Text>
          <Text style={[styles.noFamilyDesc, isDark && styles.textMuted]}>
            Crie um agregado ou junte-se a um existente
          </Text>

          {showCreate ? (
            <View style={styles.formRow}>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="Nome da família"
                placeholderTextColor="#999"
                value={createName}
                onChangeText={setCreateName}
                autoFocus
              />
              <Pressable style={styles.actionBtn} onPress={handleCreate}>
                <Text style={styles.actionBtnText}>Criar</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.primaryBtn} onPress={() => setShowCreate(true)}>
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Criar família</Text>
            </Pressable>
          )}

          {showJoin ? (
            <View style={styles.formRow}>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="Código de convite"
                placeholderTextColor="#999"
                value={joinCode}
                onChangeText={setJoinCode}
                autoFocus
              />
              <Pressable style={styles.actionBtn} onPress={handleJoin}>
                <Text style={styles.actionBtnText}>Entrar</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={[styles.secondaryBtn, isDark && styles.secondaryBtnDark]} onPress={() => setShowJoin(true)}>
              <Ionicons name="enter-outline" size={20} color={isDark ? '#fff' : '#000'} />
              <Text style={[styles.secondaryBtnText, isDark && styles.textLight]}>Tenho um código</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    )
  }

  // Has family — show members
  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </Pressable>
        <Text style={[styles.title, isDark && styles.textLight]}>{family.name}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Invite code */}
      <Pressable style={[styles.codeCard, isDark && styles.cardDark]} onPress={handleCopyCode}>
        <View>
          <Text style={[styles.codeLabel, isDark && styles.textMuted]}>Código de convite</Text>
          <Text style={[styles.codeValue, isDark && styles.textLight]}>{family.invite_code}</Text>
        </View>
        <Ionicons name="copy-outline" size={20} color={isDark ? '#999' : '#666'} />
      </Pressable>

      {/* Members */}
      <FlatList
        data={family.members.filter((m) => m.is_active)}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.memberRow, isDark && styles.memberRowDark]}
            onPress={() => handleMemberAction(item)}
          >
            <Ionicons
              name={item.role === 'admin' ? 'shield-outline' : item.role === 'dependent' ? 'person-outline' : 'people-outline'}
              size={22}
              color={isDark ? '#ccc' : '#333'}
            />
            <View style={styles.memberInfo}>
              <Text style={[styles.memberName, isDark && styles.textLight]}>
                {item.display_name || `Membro`}
              </Text>
              <Text style={[styles.memberRole, isDark && styles.textMuted]}>
                {ROLE_LABELS[item.role]}
              </Text>
            </View>
            {item.role !== 'admin' && (
              <Ionicons name="chevron-forward" size={18} color={isDark ? '#666' : '#ccc'} />
            )}
          </Pressable>
        )}
        ListHeaderComponent={
          <Text style={[styles.sectionTitle, isDark && styles.textMuted]}>
            {family.members.filter((m) => m.is_active).length} membros
          </Text>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  containerDark: { backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#000' },
  noFamily: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  noFamilyTitle: { fontSize: 18, fontWeight: '600', color: '#000', marginTop: 16 },
  noFamilyDesc: { fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 16 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#000', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, width: '100%', justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, width: '100%', justifyContent: 'center',
  },
  secondaryBtnDark: { borderColor: '#333' },
  secondaryBtnText: { fontSize: 16, fontWeight: '600', color: '#000' },
  formRow: { flexDirection: 'row', gap: 8, width: '100%' },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#000', backgroundColor: '#fff',
  },
  inputDark: { borderColor: '#333', backgroundColor: '#111', color: '#fff' },
  actionBtn: { backgroundColor: '#000', borderRadius: 10, paddingHorizontal: 20, justifyContent: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '600' },
  codeCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginVertical: 8, padding: 16, backgroundColor: '#fff', borderRadius: 12,
  },
  cardDark: { backgroundColor: '#1a1a1a' },
  codeLabel: { fontSize: 12, color: '#999', marginBottom: 2 },
  codeValue: { fontSize: 16, fontWeight: '600', fontFamily: 'monospace', color: '#000' },
  list: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#999', marginBottom: 8, marginTop: 8 },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, backgroundColor: '#fff', borderRadius: 12, marginBottom: 6,
  },
  memberRowDark: { backgroundColor: '#1a1a1a' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '500', color: '#000' },
  memberRole: { fontSize: 12, color: '#999', marginTop: 1 },
  textLight: { color: '#fff' },
  textMuted: { color: '#999' },
})
