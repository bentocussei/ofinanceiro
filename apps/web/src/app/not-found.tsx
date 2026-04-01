import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <p className="mt-4 text-lg text-muted-foreground">Página não encontrada</p>
      <p className="mt-2 text-sm text-muted-foreground">A página que procura não existe ou foi movida.</p>
      <Link href="/" className="mt-8 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        Voltar ao início
      </Link>
    </div>
  )
}
