import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 renamed `middleware` to `proxy`. The runtime is always nodejs and
 * cannot be configured.
 *
 * This is defence in depth only: it checks for the *presence* of a session
 * cookie, not its validity, because verifying a JWT here would mean importing
 * the auth config into every request. The real gate is `requireAdmin()` in
 * `app/admin/(dashboard)/layout.tsx` and in each server action — those run
 * where the data is actually read, and re-check the role against the live
 * `User` row.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin") || pathname === "/admin/login") {
    return NextResponse.next();
  }

  const cookieName =
    process.env.NODE_ENV === "production"
      ? "__Secure-bootcamp.session-token"
      : "bootcamp.session-token";

  const hasSession =
    request.cookies.has(cookieName) ||
    request.cookies.has("bootcamp.session-token");

  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
