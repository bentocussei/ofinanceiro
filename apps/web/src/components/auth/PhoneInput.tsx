"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"

interface Country {
  code: string
  name: string
  dial: string
  flag: string
  format: string // placeholder format
}

const COUNTRIES: Country[] = [
  { code: "AO", name: "Angola", dial: "+244", flag: "🇦🇴", format: "9XX XXX XXX" },
  { code: "MZ", name: "Moçambique", dial: "+258", flag: "🇲🇿", format: "8X XXX XXXX" },
  { code: "CV", name: "Cabo Verde", dial: "+238", flag: "🇨🇻", format: "XXX XXXX" },
  { code: "GW", name: "Guiné-Bissau", dial: "+245", flag: "🇬🇼", format: "XXX XXXX" },
  { code: "ST", name: "São Tomé e Príncipe", dial: "+239", flag: "🇸🇹", format: "XXX XXXX" },
  { code: "TL", name: "Timor-Leste", dial: "+670", flag: "🇹🇱", format: "XXXX XXXX" },
  { code: "PT", name: "Portugal", dial: "+351", flag: "🇵🇹", format: "9XX XXX XXX" },
  { code: "BR", name: "Brasil", dial: "+55", flag: "🇧🇷", format: "XX XXXXX-XXXX" },
  { code: "ZA", name: "África do Sul", dial: "+27", flag: "🇿🇦", format: "XX XXX XXXX" },
  { code: "NA", name: "Namíbia", dial: "+264", flag: "🇳🇦", format: "XX XXX XXXX" },
  { code: "CD", name: "RD Congo", dial: "+243", flag: "🇨🇩", format: "XX XXX XXXX" },
  { code: "CG", name: "Congo", dial: "+242", flag: "🇨🇬", format: "XX XXX XXXX" },
]

interface PhoneInputProps {
  value: string
  onChange: (fullPhone: string, countryCode: string) => void
  defaultCountry?: string
}

export function PhoneInput({ value, onChange, defaultCountry = "AO" }: PhoneInputProps) {
  const [country, setCountry] = useState<Country>(
    COUNTRIES.find((c) => c.code === defaultCountry) || COUNTRIES[0]
  )
  const [localNumber, setLocalNumber] = useState(() => {
    // Strip dial code if value already has one
    if (value) {
      const match = COUNTRIES.find((c) => value.startsWith(c.dial))
      if (match) return value.slice(match.dial.length)
    }
    return value
  })
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function handleNumberChange(raw: string) {
    // Only allow digits
    const digits = raw.replace(/\D/g, "")
    setLocalNumber(digits)
    onChange(digits ? country.dial + digits : "", country.code)
  }

  function handleCountrySelect(c: Country) {
    setCountry(c)
    setDropdownOpen(false)
    onChange(localNumber ? c.dial + localNumber : "", c.code)
  }

  return (
    <div className="flex gap-0">
      {/* Country selector */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex h-9 items-center gap-1 rounded-l-md border border-r-0 border-input bg-muted/50 px-2.5 text-sm transition-colors hover:bg-muted"
        >
          <span className="text-base leading-none">{country.flag}</span>
          <span className="text-muted-foreground">{country.dial}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        {dropdownOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-64 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
            {COUNTRIES.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => handleCountrySelect(c)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-accent ${
                  c.code === country.code ? "bg-accent/50 font-medium" : ""
                }`}
              >
                <span className="text-base leading-none">{c.flag}</span>
                <span className="flex-1 text-left">{c.name}</span>
                <span className="text-muted-foreground">{c.dial}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Phone number input */}
      <Input
        type="tel"
        placeholder={country.format}
        value={localNumber}
        onChange={(e) => handleNumberChange(e.target.value)}
        className="rounded-l-none"
        autoComplete="tel-national"
      />
    </div>
  )
}
