"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"
import { ChatPanel } from "@/components/layout/ChatPanel"
import { FamilySidebar } from "@/components/layout/FamilySidebar"
import { FamilyOnboarding } from "@/components/layout/FamilyOnboarding"

interface Family {
  id: string
  name: string
}

export default function FamilyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [family, setFamily] = useState<Family | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchFamily = () => {
    apiFetch<Family | null>("/api/v1/families/me")
      .then((f) => {
        setFamily(f)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchFamily()
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!family) {
    return <FamilyOnboarding onCreated={fetchFamily} />
  }

  return (
    <div className="flex h-screen">
      <FamilySidebar familyName={family.name} />
      <main className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 md:px-6 md:py-6">
          {children}
        </div>
      </main>
      <ChatPanel />
    </div>
  )
}
