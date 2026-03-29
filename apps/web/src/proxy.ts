import { NextRequest, NextResponse } from "next/server"

const publicRoutes = ["/login", "/register", "/landing"]
const authRoutes = ["/login", "/register"]

export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname

  const token = req.cookies.get("access_token")?.value

  // Protected routes: redirect to /login if no token
  if (!publicRoutes.some((r) => path.startsWith(r)) && !token) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }

  // Auth routes: redirect to / if already logged in
  if (authRoutes.some((r) => path.startsWith(r)) && token) {
    return NextResponse.redirect(new URL("/", req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
