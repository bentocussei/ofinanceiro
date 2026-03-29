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
        <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
      <ChatPanel />
    </div>
  )
}
