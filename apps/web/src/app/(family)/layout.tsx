"use client"

import { useEffect, useState } from "react"
import { familiesApi, type Family } from "@/lib/api/families"
import { ChatPanel } from "@/components/layout/ChatPanel"
import { FamilySidebar } from "@/components/layout/FamilySidebar"
import { FamilyOnboarding } from "@/components/layout/FamilyOnboarding"
import { PermissionProvider } from "@/providers/PermissionProvider"

export default function FamilyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [family, setFamily] = useState<Family | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchFamily = () => {
    familiesApi.me()
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
    <PermissionProvider>
      <div className="flex h-screen">
        <FamilySidebar familyName={family.name} />
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 py-4 md:px-6 md:py-6">
            {children}
          </div>
        </main>
        <ChatPanel />
      </div>
    </PermissionProvider>
  )
}
