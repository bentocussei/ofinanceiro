/**
 * API client for web app with JWT token management.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getTokens() {
  if (typeof window === 'undefined') return { access: null, refresh: null }
  return {
    access: localStorage.getItem('access_token'),
    refresh: localStorage.getItem('refresh_token'),
  }
}

const IS_SECURE = typeof window !== 'undefined' && window.location.protocol === 'https:'

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  const secure = IS_SECURE ? '; Secure' : ''
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secure}`
}

function deleteCookie(name: string) {
  // Delete with and without Secure flag to cover both HTTP and HTTPS
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax; Secure`
}

function setTokens(access: string, refresh: string) {
  localStorage.setItem('access_token', access)
  localStorage.setItem('refresh_token', refresh)
  setCookie('access_token', access, 7)
}

export function clearTokens() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  deleteCookie('access_token')
}

async function refreshAccessToken(): Promise<string | null> {
  const { refresh } = getTokens()
  if (!refresh) return null

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    })
    if (!res.ok) return null
    const data = await res.json()
    setTokens(data.access_token, data.refresh_token)
    return data.access_token
  } catch {
    return null
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { access } = getTokens()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (access) headers['Authorization'] = `Bearer ${access}`

  let res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (res.status === 401 && access) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`
      res = await fetch(`${API_URL}${path}`, { ...options, headers })
    } else {
      // Refresh failed — session expired, redirect to login
      clearTokens()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      throw new Error('Sessão expirada')
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    // FastAPI uses several shapes for `detail`:
    //   HTTPException(detail="msg")           → { detail: "msg" }
    //   HTTPException(detail={"message": ..}) → { detail: { message: "msg" } }
    //   Pydantic validation error             → { detail: [{ msg, loc, ... }] }
    // Surface the actual server message so users see real feedback.
    let message = 'Erro desconhecido'
    if (body && typeof body === 'object') {
      const d = (body as { detail?: unknown }).detail
      if (typeof d === 'string') {
        message = d
      } else if (Array.isArray(d)) {
        message = d.map((it) => (it as { msg?: string }).msg).filter(Boolean).join('; ') || message
      } else if (d && typeof d === 'object') {
        message = (d as { message?: string }).message || message
      }
    } else if (body === null) {
      message = 'Erro de rede'
    }
    throw new Error(message)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export { setTokens }
