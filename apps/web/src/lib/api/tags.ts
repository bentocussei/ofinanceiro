import { apiFetch } from "./client"

export interface Tag {
  id: string
  name: string
  color: string
}

type H = { headers?: Record<string, string> }

export const tagsApi = {
  list: (opts?: H) =>
    apiFetch<Tag[]>("/api/v1/tags/", opts),

  create: (data: { name: string; color: string }, opts?: H) =>
    apiFetch<Tag>("/api/v1/tags/", {
      method: "POST",
      body: JSON.stringify(data),
      ...opts,
    }),

  remove: (id: string, opts?: H) =>
    apiFetch<void>("/api/v1/tags/" + id, { method: "DELETE", ...opts }),
}
