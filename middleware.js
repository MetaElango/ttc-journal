import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  const path = request.nextUrl.pathname;

  // Protect app routes (you already do this, keeping here for completeness)
  const isAppRoute = path.startsWith("/app");
  if (isAppRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // If logged in and visiting /login, redirect to /app
  if (path === "/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  // ---- Profile completion gate ----
  if (user && isAppRoute) {
    const isSettings = path === "/app/settings";
    const isLogout = path === "/logout"; // route handler (POST), usually not hit here but safe

    // Allow settings page + logout even if incomplete
    if (!isSettings && !isLogout) {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, country, experience_level")
        .eq("id", user.id)
        .maybeSingle();

      // If profile missing or incomplete -> force settings
      const incomplete =
        error ||
        !profile ||
        !profile.full_name ||
        !profile.country ||
        !profile.experience_level;

      if (incomplete) {
        const url = request.nextUrl.clone();
        url.pathname = "/app/settings";
        url.searchParams.set("next", path); // after save, go here
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/app/:path*", "/login"],
};
