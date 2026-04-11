import { apiFetch } from "./client"

export type FeedbackType = "rating" | "suggestion" | "complaint"

export interface FeedbackPayload {
  feedback_type: FeedbackType
  rating?: number
  message?: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
}

export interface FeedbackSummary {
  average_rating: number
  rating_count: number
}

export const feedbackApi = {
  submit: (data: FeedbackPayload) =>
    apiFetch<{ success: boolean; message: string }>("/api/v1/feedback/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  summary: () => apiFetch<FeedbackSummary>("/api/v1/feedback/summary"),
}
