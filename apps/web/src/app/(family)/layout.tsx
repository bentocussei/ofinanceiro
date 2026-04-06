"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { familiesApi, type Family } from "@/lib/api/families"
import { FamilySidebar } from "@/components/layout/FamilySidebar"
import { FamilyOnboarding } from "@/components/layout/FamilyOnboarding"
import { MobileNav } from "@/components/layout/MobileNav"
import { PermissionProvider, usePermissions } from "@/providers/PermissionProvider"

function FamilyLayoutInner({
  children,
  family,
  onCreated,
}: {
  children: React.ReactNode
  family: Family | null
  onCreated: () => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { hasModuleAccess, loading: permLoading } = usePermissions()
  const isAssistant = pathname === "/family/assistant"

  if (permLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!hasModuleAccess("family")) {
    router.replace("/dashboard")
    return null
  }

  if (!family) {
    return <FamilyOnboarding onCreated={onCreated} />
  }

  return (
    <div className="flex h-screen">
      <FamilySidebar familyName={family.name} />
      <main className="flex-1 overflow-y-auto pb-14 md:pb-0">
        <MobileNav context="family" />
        {isAssistant ? (
          children
        ) : (
          <div className="px-4 py-4 md:px-6 md:py-6">
            {children}
          </div>
        )}
      </main>
    </div>
  )
}

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

  return (
    <PermissionProvider>
      <FamilyLayoutInner family={family} onCreated={fetchFamily}>
        {children}
      </FamilyLayoutInner>
    </PermissionProvider>
  )
}
