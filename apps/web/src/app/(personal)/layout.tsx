"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { MobileNav } from "@/components/layout/MobileNav"
import { PermissionProvider } from "@/providers/PermissionProvider"
import { usePathname } from "next/navigation"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAssistant = pathname === "/assistant"

  return (
    <PermissionProvider>
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
          <MobileNav context="personal" />
          {isAssistant ? (
            children
          ) : (
            <div className="px-4 py-4 md:px-6 md:py-6">
              {children}
            </div>
          )}
        </main>
      </div>
    </PermissionProvider>
  )
}
