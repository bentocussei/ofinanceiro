"use client"

/**
 * Logo components for O Financeiro.
 *
 * Uses inline SVG instead of <img> to avoid font rendering issues.
 * Variants: LogoIcon, LogoCompact, LogoFull
 */

export function LogoIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" fill="none">
      <rect x="0" y="0" width="120" height="120" rx="24" fill="#0F766E" opacity="0.08"/>
      <circle cx="60" cy="60" r="34" fill="none" stroke="#0D9488" strokeWidth="2.2" opacity="0.35"/>
      <circle cx="60" cy="60" r="24" fill="none" stroke="#0D9488" strokeWidth="1.8"/>
      <path d="M44 68 L56 56 L68 63 L82 34" fill="none" stroke="#0D9488" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="82" cy="34" r="3" fill="#0D9488"/>
    </svg>
  )
}

export function LogoCompact({ className = "h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 220 50" xmlns="http://www.w3.org/2000/svg" fill="none">
      {/* Mark */}
      <circle cx="25" cy="25" r="22" fill="none" stroke="#0D9488" strokeWidth="1.8" opacity="0.3"/>
      <circle cx="25" cy="25" r="15" fill="none" stroke="#0D9488" strokeWidth="1.5"/>
      <path d="M15 30 L23 23 L31 27 L39 8" fill="none" stroke="#0D9488" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="39" cy="8" r="2.2" fill="#0D9488"/>
      {/* Wordmark */}
      <text x="57" y="31" fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif" fontSize="22" fontWeight="300" letterSpacing="-0.3" fill="currentColor">O</text>
      <text x="75" y="31" fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif" fontSize="22" fontWeight="600" letterSpacing="-0.3" fill="currentColor">Financeiro</text>
    </svg>
  )
}

export function LogoFull({ className = "h-12" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 600 100" xmlns="http://www.w3.org/2000/svg" fill="none">
      {/* Mark */}
      <circle cx="50" cy="40" r="38" fill="none" stroke="#0D9488" strokeWidth="2.5" opacity="0.3"/>
      <circle cx="50" cy="40" r="28" fill="none" stroke="#0D9488" strokeWidth="2"/>
      <path d="M32 48 L44 38 L56 44 L75 11" fill="none" stroke="#0D9488" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="75" cy="11" r="3" fill="#0D9488"/>
      {/* Wordmark */}
      <text x="110" y="38" fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif" fontSize="36" fontWeight="300" letterSpacing="-0.5" fill="currentColor">O</text>
      <text x="138" y="38" fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif" fontSize="36" fontWeight="600" letterSpacing="-0.5" fill="currentColor">Financeiro</text>
      {/* Slogan */}
      <text x="112" y="62" fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif" fontSize="11.5" fontWeight="400" letterSpacing="2.8" fill="#6B7280">O  TEU  FINANCEIRO  PESSOAL</text>
    </svg>
  )
}
