import { apiFetch } from "./client"

export interface OnboardingStatus {
  completed: boolean
  completed_steps: string[]
  remaining_steps: string[]
  total_steps: number
  progress: number
}

export interface OnboardingStepResult {
  step: string
  completed: boolean
  completed_steps: string[]
}

export const onboardingApi = {
  getStatus(): Promise<OnboardingStatus> {
    return apiFetch("/api/v1/onboarding/status")
  },

  completeStep(step: string, data: Record<string, unknown> = {}): Promise<OnboardingStepResult> {
    return apiFetch("/api/v1/onboarding/step", {
      method: "PUT",
      body: JSON.stringify({ step, data }),
    })
  },
}
