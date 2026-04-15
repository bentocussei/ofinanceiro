import { Ionicons } from '@expo/vector-icons'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useRef, useState } from 'react'
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { apiFetch } from '../../lib/api'
import { themeColors } from '../../lib/tokens'

export default function ScanReceiptScreen() {
  const isDark = useColorScheme() === 'dark'
  const router = useRouter()
  const cameraRef = useRef<CameraView>(null)
  const [permission, requestPermission] = useCameraPermissions()
  const [processing, setProcessing] = useState(false)

  const tc = themeColors(isDark)
  const bg = tc.bg
  const text = tc.text
  const muted = tc.textSecondary

  async function handleCapture() {
    if (!cameraRef.current || processing) return

    setProcessing(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.7,
      })

      if (!photo?.base64) {
        Alert.alert('Erro', 'Não foi possível capturar a foto')
        setProcessing(false)
        return
      }

      // Send to OCR endpoint
      const result = await apiFetch<{
        description: string
        amount: number
        merchant?: string
        date?: string
        category?: string
      }>('/api/v1/ocr/receipt', {
        method: 'POST',
        body: JSON.stringify({
          image_base64: photo.base64,
        }),
      })

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

      // Navigate to transactions with OCR data to pre-fill the create form
      Alert.alert(
        'Recibo detectado',
        `${result.description || 'Compra'}\n${result.amount ? (result.amount / 100).toLocaleString('pt-AO') + ' Kz' : ''}\n${result.merchant || ''}`.trim(),
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Criar transacção',
            onPress: () => {
              router.replace({
                pathname: '/(tabs)/transactions',
                params: {
                  prefill_amount: result.amount?.toString() || '',
                  prefill_description: result.description || '',
                  prefill_merchant: result.merchant || '',
                  prefill_date: result.date || new Date().toISOString().slice(0, 10),
                },
              })
            },
          },
        ]
      )
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao processar recibo')
    } finally {
      setProcessing(false)
    }
  }

  // Permission not yet determined
  if (!permission) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    )
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
        <View style={styles.permissionView}>
          <Ionicons name="camera-outline" size={64} color={muted} />
          <Text style={[styles.permissionTitle, { color: text }]}>
            Acesso a camara necessário
          </Text>
          <Text style={[styles.permissionDesc, { color: muted }]}>
            Precisamos de acesso a camara para digitalizar recibos e extrair informações automaticamente.
          </Text>
          <Pressable
            style={[styles.permissionBtn, { backgroundColor: text }]}
            onPress={requestPermission}
          >
            <Text style={[styles.permissionBtnText, { color: isDark ? '#000' : '#fff' }]}>
              Permitir acesso
            </Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <Text style={[styles.backLinkText, { color: muted }]}>Voltar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <View style={styles.cameraContainer}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      >
        {/* Overlay */}
        <SafeAreaView style={styles.overlay}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} style={styles.closeBtn}>
              <Ionicons name="close" size={28} color="#fff" />
            </Pressable>
            <Text style={styles.topTitle}>Digitalizar recibo</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Guide frame */}
          <View style={styles.guideFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>

          <Text style={styles.guideText}>
            Aponte a camara para o recibo
          </Text>

          {/* Capture button */}
          <View style={styles.bottomBar}>
            <Pressable
              style={[styles.captureBtn, processing && { opacity: 0.5 }]}
              onPress={handleCapture}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <View style={styles.captureInner} />
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeBtn: { padding: 4 },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  guideFrame: {
    width: '80%',
    aspectRatio: 0.7,
    alignSelf: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#fff',
  },
  topLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  topRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  guideText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  bottomBar: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  permissionView: { alignItems: 'center', paddingHorizontal: 40, gap: 12 },
  permissionTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginTop: 16 },
  permissionDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  permissionBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  permissionBtnText: { fontSize: 16, fontWeight: '600' },
  backLink: { marginTop: 8 },
  backLinkText: { fontSize: 14 },
})
