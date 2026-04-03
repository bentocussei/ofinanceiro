import { apiFetch } from "./client"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export interface UpdateProfileData {
  name?: string
  email?: string
  currency_default?: string
  salary_day?: number
}

type H = { headers?: Record<string, string> }

export const usersApi = {
  updateProfile: (data: UpdateProfileData, opts?: H) =>
    apiFetch<void>("/api/v1/users/me", {
      method: "PUT",
      body: JSON.stringify(data),
      ...opts,
    }),

  changePassword: (currentPassword: string | undefined | null, newPassword: string, opts?: H) =>
    apiFetch<void>("/api/v1/users/me/password", {
      method: "PUT",
      body: JSON.stringify({
        ...(currentPassword ? { current_password: currentPassword } : {}),
        new_password: newPassword,
      }),
      ...opts,
    }),

  uploadAvatar: async (file: File): Promise<{ avatar_url: string; file_id: string }> => {
    const token = localStorage.getItem("access_token")
    const formData = new FormData()
    formData.append("file", file)

    const res = await fetch(`${API_URL}/api/v1/users/me/avatar`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    if (!res.ok) throw new Error("Erro ao enviar foto")
    return res.json()
  },

  deleteAvatar: () =>
    apiFetch<{ message: string }>("/api/v1/users/me/avatar", {
      method: "DELETE",
    }),
}
