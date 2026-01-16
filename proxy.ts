import { NextRequest, NextResponse } from "next/server";

// Auth routes that must be accessible without authentication
const authRoutes = ["/login", "/signup", "/api/auth"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Allow auth routes (login, signup, NextAuth API)
  if (authRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie =
    request.cookies.get("authjs.session-token") ||
    request.cookies.get("__Secure-authjs.session-token");

  if (!sessionCookie) {
    // Redirect to login with callback URL (including query params)
    const loginUrl = new URL("/login", request.url);
    const callbackUrl = search ? `${pathname}${search}` : pathname;
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
