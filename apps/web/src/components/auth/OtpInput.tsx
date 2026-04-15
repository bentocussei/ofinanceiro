"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"

interface OtpInputProps {
  length?: number
  disabled?: boolean
  onComplete: (otp: string) => void
}

export function OtpInput({ length = 6, disabled = false, onComplete }: OtpInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(""))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  // Auto-submit when all digits filled
  const checkComplete = useCallback(
    (newDigits: string[]) => {
      const code = newDigits.join("")
      if (code.length === length && newDigits.every((d) => d !== "")) {
        onComplete(code)
      }
    },
    [length, onComplete],
  )

  function handleChange(index: number, value: string) {
    const cleaned = value.replace(/\D/g, "")

    // iOS/Android SMS auto-fill injects the whole code as a single onChange
    // event on the first field (not a paste event). Detect it and fill all.
    if (cleaned.length >= length) {
      const filled = cleaned.slice(0, length).split("")
      setDigits(filled)
      inputRefs.current[length - 1]?.focus()
      onComplete(filled.join(""))
      return
    }

    const digit = cleaned.slice(-1)
    const newDigits = [...digits]
    newDigits[index] = digit
    setDigits(newDigits)

    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    checkComplete(newDigits)
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length)
    if (!pasted) return

    const newDigits = pasted.split("").concat(Array(length - pasted.length).fill(""))
    setDigits(newDigits)

    const focusIndex = Math.min(pasted.length, length - 1)
    inputRefs.current[focusIndex]?.focus()

    checkComplete(newDigits)
  }

  function reset() {
    setDigits(Array(length).fill(""))
    inputRefs.current[0]?.focus()
  }

  // Expose reset via ref-like pattern
  useEffect(() => {
    // Reset is available via the parent calling setKey or remounting
  }, [])

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <Input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          // First input accepts full paste/autofill; others only 1 digit
          maxLength={index === 0 ? length : 1}
          // Triggers iOS/Android SMS code auto-fill suggestion
          autoComplete={index === 0 ? "one-time-code" : "off"}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          disabled={disabled}
          className="w-11 h-12 text-center text-xl font-bold tabular-nums sm:w-12"
          aria-label={`Dígito ${index + 1}`}
        />
      ))}
    </div>
  )
}
