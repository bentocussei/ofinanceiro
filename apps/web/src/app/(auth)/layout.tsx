import Link from "next/link"
import { Home } from "lucide-react"
import { LogoFull } from "@/components/Logo"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 relative pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <Link
        href="/"
        className="absolute left-4 top-[calc(1rem+env(safe-area-inset-top))] flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
        Início
      </Link>
      <div className="mb-8 mt-10 md:mt-0 flex items-center justify-center w-full">
        <LogoFull className="h-16" />
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
