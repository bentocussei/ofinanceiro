import { apiFetch } from "./client"

interface PermissionsResponse {
  permissions: string[]
}

export const permissionsApi = {
  mine: () =>
    apiFetch<PermissionsResponse>("/api/v1/permissions/mine"),
}
