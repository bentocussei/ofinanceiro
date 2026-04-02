import Link from "next/link"
import { Home } from "lucide-react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 relative">
      <Link
        href="/"
        className="absolute top-4 left-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
        Início
      </Link>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">O Financeiro</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Gestão financeira pessoal e familiar
        </p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
