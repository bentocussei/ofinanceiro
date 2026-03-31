import { ChatPanel } from "@/components/layout/ChatPanel"
import { Sidebar } from "@/components/layout/sidebar"
import { PermissionProvider } from "@/providers/PermissionProvider"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PermissionProvider>
      <div className="flex h-screen">
        <Sidebar />
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
