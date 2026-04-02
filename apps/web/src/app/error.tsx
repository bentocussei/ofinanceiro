"use client"

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <h1 className="text-4xl font-bold text-destructive">Erro</h1>
      <p className="mt-4 text-lg text-muted-foreground">Algo correu mal. Pedimos desculpa.</p>
      <button onClick={reset} className="mt-8 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        Tentar novamente
      </button>
    </div>
  )
}
