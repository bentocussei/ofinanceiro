"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronsUpDown, User, Users } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { apiFetch } from "@/lib/api"
import { getContext, setContext } from "@/lib/context"

interface Family {
  id: string
  name: string
}

export function ContextSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter()
  const [family, setFamily] = useState<Family | null>(null)
  const [current, setCurrent] = useState(getContext())
  const [open, setOpen] = useState(false)

  useEffect(() => {
    apiFetch<Family | null>("/api/v1/families/me")
      .then((f) => setFamily(f))
      .catch(() => {})
  }, [])

  const handleSelect = (ctx: "personal" | `family:${string}`) => {
    setContext(ctx)
    setCurrent(ctx)
    setOpen(false)
    if (ctx === "personal") {
      router.push("/dashboard")
    } else {
      router.push("/family/dashboard")
    }
  }

  const isPersonal = current === "personal"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-sidebar-accent cursor-pointer ${
          collapsed ? "justify-center" : ""
        }`}
      >
        {isPersonal ? (
          <User className="h-4 w-4 shrink-0 text-primary" />
        ) : (
          <Users className="h-4 w-4 shrink-0 text-primary" />
        )}
        {!collapsed && (
          <>
            <span className="flex-1 text-left truncate text-sidebar-foreground">
              {isPersonal ? "Pessoal" : family?.name || "Familia"}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          </>
        )}
      </PopoverTrigger>
      <PopoverContent
        side={collapsed ? "right" : "bottom"}
        align="start"
        className="w-52 p-1"
      >
        <button
          onClick={() => handleSelect("personal")}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
        >
          <User className="h-4 w-4" />
          <span className="flex-1 text-left">Pessoal</span>
          {isPersonal && <Check className="h-4 w-4 text-primary" />}
        </button>
        {family && (
          <button
            onClick={() => handleSelect(`family:${family.id}`)}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
          >
            <Users className="h-4 w-4" />
            <span className="flex-1 text-left truncate">{family.name}</span>
            {!isPersonal && <Check className="h-4 w-4 text-primary" />}
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}
