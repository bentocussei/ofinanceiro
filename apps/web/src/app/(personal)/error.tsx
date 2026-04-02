"use client"

export default function PersonalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <h2 className="text-2xl font-bold text-destructive">Erro</h2>
      <p className="mt-3 text-sm text-muted-foreground">Algo correu mal. Pedimos desculpa.</p>
      <button onClick={reset} className="mt-6 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        Tentar novamente
      </button>
    </div>
  )
}
