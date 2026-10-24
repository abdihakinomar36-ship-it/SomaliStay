import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { defaultLocale, locales } from "@/lib/i18n/config";

const PUBLIC_FILE = /\.(.*)$/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Locale redirect: / -> /en (default) or the visitor's saved choice
  const hasLocale = locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (!hasLocale && !pathname.startsWith("/auth") && !pathname.startsWith("/api") && !PUBLIC_FILE.test(pathname)) {
    const cookieLocale = request.cookies.get("somalistay-locale")?.value;
    const locale = locales.includes(cookieLocale as never)
      ? (cookieLocale as (typeof locales)[number])
      : defaultLocale;
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    const redirect = NextResponse.redirect(url);
    if (cookieLocale && locales.includes(cookieLocale as never)) {
      redirect.cookies.set("somalistay-locale", cookieLocale, { path: "/", maxAge: 31536000, sameSite: "lax" });
    }
    return redirect;
  }

  // 2. Refresh the Supabase session (cookie-based auth)
  // Also expose the active locale to the root layout (for <html lang>).
  const activeLocale = locales.find(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );
  const requestHeaders = new Headers(request.headers);
  if (activeLocale) requestHeaders.set("x-somalistay-locale", activeLocale);
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
