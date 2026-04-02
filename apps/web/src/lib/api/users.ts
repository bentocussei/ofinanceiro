import { apiFetch } from "./client"

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
}
