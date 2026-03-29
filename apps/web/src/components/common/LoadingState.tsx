import React from "react"
import { AlertTriangle } from "lucide-react"

export function LoadingSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-12 bg-muted rounded-lg" />
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 animate-pulse">
      <div className="h-3 w-20 bg-muted rounded mb-2" />
      <div className="h-8 w-32 bg-muted rounded" />
    </div>
  )
}

export function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="opacity-30">{icon}</div>
      <p className="text-muted-foreground text-center">{message}</p>
    </div>
  )
}

export function ErrorState({
  message = "Ocorreu um erro. Verifique a sua ligação.",
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="opacity-30"><AlertTriangle className="h-12 w-12" /></div>
      <p className="text-muted-foreground text-center">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-blue-500 hover:text-blue-600 font-medium mt-2"
        >
          Tentar novamente
        </button>
      )}
    </div>
  )
}
