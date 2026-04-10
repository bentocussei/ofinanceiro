"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { familiesApi, type Family } from "@/lib/api/families"
import { FamilySidebar } from "@/components/layout/FamilySidebar"
import { FamilyOnboarding } from "@/components/layout/FamilyOnboarding"
import { MobileNav } from "@/components/layout/MobileNav"
import { PermissionProvider } from "@/providers/PermissionProvider"

function FamilyLayoutInner({
  children,
  family,
  onCreated,
}: {
  children: React.ReactNode
  family: Family | null
  onCreated: () => void
}) {
  const pathname = usePathname()
  const isAssistant = pathname === "/family/assistant"

  // Access rule: anyone who is a member of a family can see the family
  // shell. Membership is established by `family !== null` (loaded from
  // /api/v1/families/me) — non-members fall through to FamilyOnboarding.
  //
  // The previous gate also required hasModuleAccess("family") on top, but
  // family:* permission codes are NOT auto-granted on family join (only
  // explicit user_permissions or PlanPermission grants populate them), so
  // ordinary ADULT members had zero family:* permissions and the gate
  // always denied. The gate then ran router.replace() during render,
  // bouncing every /family/* visit straight back to /dashboard and
  // making the personal context look like the only one available.
  // Per-operation permissions are still enforced at the API endpoint
  // level — this layout check only decides whether the family shell is
  // rendered at all.

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
