import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { defaultLocale } from "@/lib/i18n/config";

// Handles the email-verification and password-reset redirects from Supabase auth.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const errorParam = searchParams.get("error");

  // Only allow internal redirect targets: /<locale>/... with no protocol or
  // protocol-relative tricks.
  function safeNext(): string | null {
    if (!nextParam) return null;
    if (!/^\/(en|so)(\/[^\s"']*)?$/.test(nextParam)) return null;
    if (nextParam.includes("//") || nextParam.includes(":")) return null;
    return nextParam;
  }

  if (errorParam) {
    // Expired or already-used link: send the user to sign in.
    return NextResponse.redirect(`${origin}/${defaultLocale}/auth/sign-in?auth_error=${encodeURIComponent(errorParam)}`);
  }

  if (code) {
    const next = safeNext() ?? `/${defaultLocale}/guest`;
    const response = NextResponse.redirect(`${origin}${next}`);
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // Expired or already-used code: do not pretend the session was restored.
      return NextResponse.redirect(
        `${origin}/${defaultLocale}/auth/sign-in?auth_error=${encodeURIComponent(error.code || "otp_expired")}`
      );
    }
    return response;
  }

  // No code: Supabase reports failures (e.g. expired links) in the URL hash
  // (#error=...), which never reaches the server. Serve a minimal page that
  // first checks the hash for an error, and only then forwards the user to
  // the validated destination (auth-guards keep the intent) or sign-in.
  const fallbackNext = safeNext();
  const destination = fallbackNext ?? `/${defaultLocale}/auth/sign-in`;
  return new NextResponse(
    `<!doctype html><html><body><script>
      (function(){
        var h = (location.hash||"").replace(/^#/,"?");
        var p = new URLSearchParams(h);
        var err = p.get("error");
        var signIn = ${JSON.stringify(`/${defaultLocale}/auth/sign-in`)};
        var next = ${JSON.stringify(destination)};
        location.replace(err ? signIn + "?auth_error=" + encodeURIComponent(err) : next);
      })();
    </script></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}
