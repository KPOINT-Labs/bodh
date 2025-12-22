import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/login", "/signup"]
  const isPublicRoute = publicRoutes.includes(pathname)

  // Auth API routes should always be accessible
  const isAuthApiRoute = pathname.startsWith("/api/auth")

  // If it's a public route or auth API, allow access
  if (isPublicRoute || isAuthApiRoute) {
    return NextResponse.next()
  }

  // Check for session token (Auth.js v5 uses this cookie name)
  const sessionToken = request.cookies.get("authjs.session-token") ||
                       request.cookies.get("__Secure-authjs.session-token")

  // Protected routes - redirect to login if no session token
  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all routes except static files and api routes (except auth)
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
