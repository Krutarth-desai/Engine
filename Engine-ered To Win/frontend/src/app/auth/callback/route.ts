import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";
  const error = requestUrl.searchParams.get("error");
  const error_description = requestUrl.searchParams.get("error_description");

  if (error || error_description) {
    const errorMsg = error_description || error || "Authentication error occurred";
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(errorMsg)}`, request.url)
    );
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gpelojjclxyypvxelhat.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZWxvampjbHh5eXB2eGVsaGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxOTEwMTEsImV4cCI6MjEwMzc2NzAxMX0.4iurCAi_Z4O8b8qYfBzfiDnRN4zEuXvV9R5XcFNh020",
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // The setAll method was called from a Server Component.
            }
          },
        },
      }
    );

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(exchangeError.message)}`, request.url)
      );
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL(next, request.url));
}
