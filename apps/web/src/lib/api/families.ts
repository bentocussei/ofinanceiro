import { apiFetch } from "./client"

export interface FamilyMember {
  id: string
  user_id: string
  role: string
  display_name: string | null
  is_active: boolean
  relation?: string | null
  can_add_transactions?: boolean
  can_edit_budgets?: boolean
  can_view_all?: boolean
  can_invite?: boolean
}

export interface Family {
  id: string
  name: string
  admin_user_id?: string
  invite_code: string | null
  members?: FamilyMember[]
  currency?: string | null
  month_start_day?: number | null
  contribution_model?: string | null
}

export interface UpdateMemberData {
  relation?: string | null
  can_add_transactions?: boolean
  can_edit_budgets?: boolean
  can_view_all?: boolean
  can_invite?: boolean
}

export interface UpdateFamilyData {
  name?: string
  currency?: string
  month_start_day?: number
  contribution_model?: string
}

type H = { headers?: Record<string, string> }

export const familiesApi = {
  me: (opts?: H) =>
    apiFetch<Family | null>("/api/v1/families/me", opts),

  create: (name: string, opts?: H) =>
    apiFetch<Family>("/api/v1/families/", {
      method: "POST",
      body: JSON.stringify({ name }),
      ...opts,
    }),

  update: (id: string, data: UpdateFamilyData, opts?: H) =>
    apiFetch<Family>("/api/v1/families/" + id, {
      method: "PUT",
      body: JSON.stringify(data),
      ...opts,
    }),

  remove: (id: string, opts?: H) =>
    apiFetch<void>("/api/v1/families/" + id, { method: "DELETE", ...opts }),

  join: (inviteCode: string, opts?: H) =>
    apiFetch<{ family_id: string }>("/api/v1/families/join", {
      method: "POST",
      body: JSON.stringify({ invite_code: inviteCode }),
      ...opts,
    }),

  leave: (opts?: H) =>
    apiFetch<void>("/api/v1/families/leave", { method: "POST", ...opts }),

  updateMember: (memberId: string, data: UpdateMemberData, opts?: H) =>
    apiFetch<void>("/api/v1/families/members/" + memberId, {
      method: "PUT",
      body: JSON.stringify(data),
      ...opts,
    }),

  removeMember: (memberId: string, opts?: H) =>
    apiFetch<void>("/api/v1/families/members/" + memberId, {
      method: "DELETE",
      ...opts,
    }),

  changeMemberRole: (memberId: string, role: string, opts?: H) =>
    apiFetch<void>("/api/v1/families/members/" + memberId + "/role", {
      method: "PUT",
      body: JSON.stringify({ role }),
      ...opts,
    }),
}
