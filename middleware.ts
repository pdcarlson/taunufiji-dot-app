import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// We re-construct the cookie name here to avoid importing complex libs in Edge Runtime
// But standard string constants are fine.
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const SESSION_COOKIE = `a_session_${PROJECT_ID}`;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE);

  // 1. Protected Routes (Dashboard)
  if (pathname.startsWith("/dashboard")) {
    if (!sessionCookie) {
      // No cookie? Redirect to login.
      const loginUrl = new URL("/login", request.url);
      // Optional: Add ?next= param here if we want deep linking later
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Auth Routes (Login)
  // If user is ALREADY logged in, keep them out of login page
  if (pathname === "/login") {
    if (sessionCookie) {
      const dashboardUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

// Optimized Matcher
// Excludes static assets, APIs, and Next.js internals
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, etc)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|noise.png).*)",
  ],
};
