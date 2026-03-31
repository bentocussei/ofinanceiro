"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { permissionsApi } from "@/lib/api/permissions"

interface PermissionContextType {
  permissions: Set<string>
  loading: boolean
  hasPermission: (code: string) => boolean
  hasAnyPermission: (codes: string[]) => boolean
  hasModuleAccess: (module: string) => boolean
  refresh: () => Promise<void>
}

const PermissionContext = createContext<PermissionContextType>({
  permissions: new Set(),
  loading: true,
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasModuleAccess: () => false,
  refresh: async () => {},
})

export function PermissionProvider({ children }: { children: ReactNode }) {
  const [permissions, setPermissions] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const fetchPermissions = async () => {
    try {
      const res = await permissionsApi.mine()
      setPermissions(new Set(res.permissions))
    } catch {
      // If permissions fail to load, default to empty (most restrictive)
      setPermissions(new Set())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPermissions()
  }, [])

  const hasPermission = (code: string): boolean => {
    return permissions.has(code)
  }

  const hasAnyPermission = (codes: string[]): boolean => {
    return codes.some((code) => permissions.has(code))
  }

  const hasModuleAccess = (module: string): boolean => {
    for (const perm of permissions) {
      if (perm.startsWith(`${module}:`)) return true
    }
    return false
  }

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        loading,
        hasPermission,
        hasAnyPermission,
        hasModuleAccess,
        refresh: fetchPermissions,
      }}
    >
      {children}
    </PermissionContext.Provider>
  )
}

export function usePermissions() {
  return useContext(PermissionContext)
}

export function RequirePermission({
  permission,
  children,
  fallback = null,
}: {
  permission: string
  children: ReactNode
  fallback?: ReactNode
}) {
  const { hasPermission, loading } = usePermissions()
  if (loading) return null
  if (!hasPermission(permission)) return fallback
  return children
}

export function RequireAnyPermission({
  permissions,
  children,
  fallback = null,
}: {
  permissions: string[]
  children: ReactNode
  fallback?: ReactNode
}) {
  const { hasAnyPermission, loading } = usePermissions()
  if (loading) return null
  if (!hasAnyPermission(permissions)) return fallback
  return children
}

export function RequireModule({
  module,
  children,
  fallback = null,
}: {
  module: string
  children: ReactNode
  fallback?: ReactNode
}) {
  const { hasModuleAccess, loading } = usePermissions()
  if (loading) return null
  if (!hasModuleAccess(module)) return fallback
  return children
}
