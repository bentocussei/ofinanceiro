import { NextRequest, NextResponse } from "next/server"

const publicRoutes = ["/", "/login", "/register"]
const authRoutes = ["/login", "/register"]

export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname
  const token = req.cookies.get("access_token")?.value

  // Landing page (/) is public
  if (path === "/") {
    // If logged in, redirect to dashboard
    if (token) {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
    }
    return NextResponse.next()
  }

  // Auth routes: redirect to dashboard if already logged in
  if (authRoutes.some((r) => path.startsWith(r)) && token) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
  }

  // Protected routes: redirect to /login if no token
  if (!publicRoutes.some((r) => path === r) && !token) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|screenshots|videos|robots.txt|sitemap.xml).*)"],
}
