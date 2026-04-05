import { NextRequest, NextResponse } from "next/server"

const publicRoutes = ["/", "/login", "/register"]
const authRoutes = ["/login", "/register"]

/**
 * Check if a JWT token is still valid (not expired).
 * Decodes the payload without verification — the API validates the signature.
 */
function isTokenValid(token: string): boolean {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return false
    const payload = JSON.parse(atob(parts[1]))
    if (!payload.exp) return false
    // Token is valid if expiry is in the future (with 30s buffer)
    return payload.exp * 1000 > Date.now() - 30_000
  } catch {
    return false
  }
}

export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname
  const token = req.cookies.get("access_token")?.value
  const hasValidToken = token ? isTokenValid(token) : false

  // Landing page (/) is public
  if (path === "/") {
    if (hasValidToken) {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
    }
    return NextResponse.next()
  }

  // Auth routes: redirect to dashboard if already logged in with valid token
  if (authRoutes.some((r) => path.startsWith(r)) && hasValidToken) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
  }

  // Protected routes: redirect to /login if no valid token
  if (!publicRoutes.some((r) => path === r) && !hasValidToken) {
    // Clear expired cookie
    const response = NextResponse.redirect(new URL("/login", req.nextUrl))
    response.cookies.delete("access_token")
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|screenshots|videos|robots.txt|sitemap.xml).*)"],
}
