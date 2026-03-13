import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// ─── In-memory rate limiter (per-IP, sliding window) ─────────────
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Cleanup expired entries every 5 min
if (typeof globalThis !== "undefined") {
  const cleanup = () => {
    const now = Date.now();
    for (const [k, v] of rateLimitStore) {
      if (now > v.resetAt) rateLimitStore.delete(k);
    }
  };
  setInterval(cleanup, 5 * 60_000);
}

function checkRateLimit(ip: string, pathname: string): { blocked: boolean; remaining: number } {
  // Stricter limits for admin/write operations, relaxed for reads
  const isAdmin = pathname.startsWith("/api/admin");
  const limit = isAdmin ? 30 : 120; // requests per window
  const windowMs = 60_000; // 1 minute

  const key = `${ip}:${isAdmin ? "admin" : "api"}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { blocked: false, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { blocked: true, remaining: 0 };
  }

  entry.count += 1;
  return { blocked: false, remaining: limit - entry.count };
}

// ─── Middleware ───────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets and public files
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon.ico")) {
    return NextResponse.next();
  }

  // Rate limiting for API routes
  if (pathname.startsWith("/api/")) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
    const { blocked, remaining } = checkRateLimit(ip, pathname);

    if (blocked) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intente de nuevo en un momento." },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    // Attach rate limit headers to the final response below
    request.headers.set("x-ratelimit-remaining", String(remaining));
  }

  // Update session and get user
  const { response, user } = await updateSession(request);

  // Allow login and auth callback routes without auth
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    // If user is already logged in and tries to access login, redirect to dashboard
    if (user && pathname.startsWith("/login")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return response;
  }

  // Protect all other routes: redirect to login if not authenticated
  if (!user) {
    // For API routes, return 401 instead of redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // For pages, redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo-ibc.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
