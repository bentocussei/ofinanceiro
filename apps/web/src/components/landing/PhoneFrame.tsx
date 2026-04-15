import Image from "next/image"

interface PhoneFrameProps {
  src: string
  alt: string
  /** Controls the maximum width of the phone on larger screens. */
  className?: string
  /** Render eagerly — use for above-the-fold phones (hero). */
  priority?: boolean
}

/**
 * Decorative iPhone-like frame around a mobile screenshot.
 * The screenshot should already be at device resolution (393×852 or similar).
 * Uses next/image for automatic responsive srcset + lazy loading.
 */
export function PhoneFrame({ src, alt, className, priority = false }: PhoneFrameProps) {
  return (
    <div
      className={`relative mx-auto w-full max-w-[260px] ${className ?? ""}`}
      aria-hidden={alt === "" ? true : undefined}
    >
      {/* Outer bezel */}
      <div className="relative rounded-[2.5rem] border-[10px] border-neutral-900 bg-neutral-900 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.35)] dark:border-neutral-800 dark:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.6)]">
        {/* Notch */}
        <div className="pointer-events-none absolute left-1/2 top-0 z-10 h-[22px] w-[96px] -translate-x-1/2 rounded-b-[14px] bg-neutral-900 dark:bg-neutral-800" />

        {/* Screen */}
        <div className="overflow-hidden rounded-[1.9rem] bg-background">
          <Image
            src={src}
            alt={alt}
            width={393}
            height={852}
            priority={priority}
            sizes="(max-width: 768px) 240px, 260px"
            className="block h-auto w-full"
          />
        </div>
      </div>
    </div>
  )
}
