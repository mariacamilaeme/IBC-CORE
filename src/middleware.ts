import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (pathname.startsWith("/login") || pathname.startsWith("/_next") || pathname.startsWith("/api/auth")) {
    return await updateSession(request);
  }

  // Check auth for dashboard routes
  const response = await updateSession(request);

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo-ibc.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
