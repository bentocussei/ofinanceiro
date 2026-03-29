"use client"

import { apiFetch, clearTokens, setTokens } from "./api"

export interface UserProfile {
  id: string
  name: string
  phone: string
  email?: string
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
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`
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
  password: string
): Promise<boolean> {
  try {
    const data = await apiFetch<AuthResponse>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ phone, name, password }),
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
