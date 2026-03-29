/**
 * API client with JWT token management.
 * All requests go through this client for consistent auth handling.
 */

import * as SecureStore from 'expo-secure-store'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'

const TOKEN_KEY = 'access_token'
const REFRESH_KEY = 'refresh_token'

export async function getTokens() {
  const access = await SecureStore.getItemAsync(TOKEN_KEY)
  const refresh = await SecureStore.getItemAsync(REFRESH_KEY)
  return { access, refresh }
}

export async function setTokens(access: string, refresh: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, access)
  await SecureStore.setItemAsync(REFRESH_KEY, refresh)
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
  await SecureStore.deleteItemAsync(REFRESH_KEY)
}

async function refreshAccessToken(): Promise<string | null> {
  const { refresh } = await getTokens()
  if (!refresh) return null

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    })

    if (!res.ok) return null

    const data = await res.json()
    await setTokens(data.access_token, data.refresh_token)
    return data.access_token
  } catch {
    return null
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const { access } = await getTokens()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (access) {
    headers['Authorization'] = `Bearer ${access}`
  }

  let res = await fetch(`${API_URL}${path}`, { ...options, headers })

  // Auto-refresh on 401
  if (res.status === 401 && access) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`
      res = await fetch(`${API_URL}${path}`, { ...options, headers })
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: { message: 'Erro de rede' } }))
    throw new ApiError(res.status, error.detail?.message || 'Erro desconhecido', error.detail?.code)
  }

  if (res.status === 204) return undefined as T

  return res.json()
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
