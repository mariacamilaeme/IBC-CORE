import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do NOT run any Supabase logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could lead to users being
  // randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // IMPORTANT: You *must* return the supabaseResponse object as-is.
  // If you create a new response with NextResponse.next(), make sure to:
  // 1. Pass the request: NextResponse.next({ request })
  // 2. Copy over the cookies: supabaseResponse.cookies.getAll().forEach(...)
  // Failing to do so will cause the browser and server to go out of sync
  // and terminate the user's session prematurely.

  return { response: supabaseResponse, user };
}
