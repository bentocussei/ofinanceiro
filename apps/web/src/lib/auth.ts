"use client"

import { apiFetch, clearTokens, setTokens } from "./api"

export interface UserProfile {
  id: string
  name: string
  phone: string
  email?: string
  avatar_url?: string
  plan?: string
  currency?: string
  language?: string
  salary_day?: number
}

interface AuthResponse {
  access_token: string
  refresh_token: string
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax; Secure`
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax; Secure`
}

function storeTokens(access: string, refresh: string) {
  setTokens(access, refresh)
  setCookie("access_token", access, 7)
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false
  return !!localStorage.getItem("access_token")
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("access_token")
}

export async function login(phone: string, password: string): Promise<boolean> {
  try {
    const data = await apiFetch<AuthResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, password }),
    })
    storeTokens(data.access_token, data.refresh_token)
    return true
  } catch {
    return false
  }
}

export async function register(
  phone: string,
  name: string,
  password?: string,
  country?: string,
  email?: string,
  promoCode?: string,
): Promise<boolean> {
  try {
    const body: Record<string, string> = { phone, name, country: country || "AO" }
    if (password) body.password = password
    if (email) body.email = email
    if (promoCode) body.promo_code = promoCode
    // Register NÃO retorna tokens — apenas cria user e envia OTP
    // Tokens são emitidos apenas após verificação OTP
    await apiFetch<{ message: string }>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    })
    return true
  } catch {
    return false
  }
}

export async function sendOtp(phone: string): Promise<boolean> {
  try {
    await apiFetch("/api/v1/auth/otp/send", {
      method: "POST",
      body: JSON.stringify({ phone }),
    })
    return true
  } catch {
    return false
  }
}

export async function verifyOtp(phone: string, otp: string): Promise<boolean> {
  try {
    const data = await apiFetch<AuthResponse>("/api/v1/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ phone, otp }),
    })
    storeTokens(data.access_token, data.refresh_token)
    return true
  } catch {
    return false
  }
}

export function logout(): void {
  clearTokens()
  deleteCookie("access_token")
  window.location.href = "/login"
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    return await apiFetch<UserProfile>("/api/v1/users/me")
  } catch {
    return null
  }
}
