import { ChatPanel } from "@/components/layout/ChatPanel"
import { Sidebar } from "@/components/layout/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 md:px-6 md:py-6">
          {children}
        </div>
      </main>
      <ChatPanel />
    </div>
  )
}
