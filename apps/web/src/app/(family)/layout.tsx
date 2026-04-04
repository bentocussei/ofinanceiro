"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { familiesApi, type Family } from "@/lib/api/families"
import { FamilySidebar } from "@/components/layout/FamilySidebar"
import { FamilyOnboarding } from "@/components/layout/FamilyOnboarding"
import { PermissionProvider, usePermissions } from "@/providers/PermissionProvider"
import { MessageCircle } from "lucide-react"
import Link from "next/link"

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
      <main className="flex-1 overflow-y-auto">
        {isAssistant ? (
          children
        ) : (
          <div className="px-4 py-4 md:px-6 md:py-6">
            {children}
          </div>
        )}
      </main>
      {!isAssistant && (
        <Link
          href="/family/assistant"
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-200 hover:scale-105 md:hidden"
          title="Abrir assistente"
        >
          <MessageCircle className="h-6 w-6" />
        </Link>
      )}
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
