"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { PermissionProvider } from "@/providers/PermissionProvider"
import { MessageCircle } from "lucide-react"
import Link from "next/link"
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
        <main className="flex-1 overflow-y-auto">
          {isAssistant ? (
            children
          ) : (
            <div className="px-4 py-4 md:px-6 md:py-6">
              {children}
            </div>
          )}
        </main>
        {/* Floating assistant button — hidden on assistant page */}
        {!isAssistant && (
          <Link
            href="/assistant"
            className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-200 hover:scale-105 md:hidden"
            title="Abrir assistente"
          >
            <MessageCircle className="h-6 w-6" />
          </Link>
        )}
      </div>
    </PermissionProvider>
  )
}
