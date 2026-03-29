import { apiFetch } from "./client"

export interface Bill {
  id: string
  name: string
  amount: number
  category: string | null
  due_day: number
  frequency: string
  status: string
  auto_pay: boolean
  reminder_days: number | null
  next_due_date: string | null
}

export interface CreateBillData {
  name: string
  amount: number
  category?: string
  due_day: number
  frequency: string
  auto_pay: boolean
  reminder_days?: number
}

export interface UpdateBillData {
  name: string
  amount: number
  category: string | null
  due_day: number
  frequency: string
  auto_pay: boolean
  reminder_days: number | null
}

type H = { headers?: Record<string, string> }

export const billsApi = {
  list: (opts?: H) =>
    apiFetch<Bill[]>("/api/v1/bills/", opts),

  create: (data: CreateBillData, opts?: H) =>
    apiFetch<Bill>("/api/v1/bills/", {
      method: "POST",
      body: JSON.stringify(data),
      ...opts,
    }),

  update: (id: string, data: UpdateBillData, opts?: H) =>
    apiFetch<Bill>("/api/v1/bills/" + id, {
      method: "PUT",
      body: JSON.stringify(data),
      ...opts,
    }),

  pay: (id: string, opts?: H) =>
    apiFetch<void>("/api/v1/bills/" + id + "/pay", {
      method: "POST",
      ...opts,
    }),

  remove: (id: string, opts?: H) =>
    apiFetch<void>("/api/v1/bills/" + id, { method: "DELETE", ...opts }),
}
