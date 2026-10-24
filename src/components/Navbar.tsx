"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import Logo from "./Logo";
import { setPreferredLocaleAction } from "@/actions/auth";
import { captureAndSaveFormState } from "@/lib/form-state";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/en";

type NavUser = { id: string; email: string } | null;

export default function Navbar({
  locale,
  t,
  user,
  role,
  fullName,
}: {
  locale: Locale;
  t: Dictionary;
  user: NavUser;
  role: "guest" | "partner" | "admin" | null;
  fullName: string | null;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(next: Locale) {
    if (next === locale) return;
    // Keep whatever the visitor has typed into forms on this page.
    captureAndSaveFormState(pathname);
    const parts = pathname.split("/");
    parts[1] = next;
    document.cookie = `somalistay-locale=${next}; path=/; max-age=31536000; samesite=lax`;
    // Persist the preference on the user's profile when signed in.
    void setPreferredLocaleAction(next);
    router.push(parts.join("/") || `/${next}`);
    router.refresh();
  }

  const links = [
    { href: `/${locale}`, label: t.nav.home },
    { href: `/${locale}/hotels`, label: t.nav.hotels },
    { href: `/${locale}/partner`, label: t.nav.partner },
  ];

  const dashboards = user
    ? (
        [
          { href: `/${locale}/guest`, label: t.nav.myBookings },
          role === "admin" ? { href: `/${locale}/admin`, label: t.nav.admin } : null,
          role && role !== "guest"
            ? { href: `/${locale}/partner`, label: t.nav.dashboard }
            : null,
        ] as Array<{ href: string; label: string } | null>
      ).filter((x): x is { href: string; label: string } => x !== null)
    : [];

  async function signOut() {
    const { createClient } = await import("@/lib/supabase/browser");
    await createClient().auth.signOut();
    router.push(`/${locale}`);
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href={`/${locale}`} className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-slate-700 hover:text-brand-green"
            >
              {l.label}
            </Link>
          ))}
          {dashboards.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-brand-blue hover:text-brand-blue-dark"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <div className="flex overflow-hidden rounded-lg border border-slate-300 text-xs font-semibold" role="group" aria-label={t.nav.language}>
            <button
              onClick={() => switchLocale("en")}
              lang="en"
              aria-pressed={locale === "en"}
              className={`px-2.5 py-1.5 ${locale === "en" ? "bg-brand-green text-white" : "bg-white text-slate-600 hover:text-slate-900"}`}
            >
              EN
            </button>
            <button
              onClick={() => switchLocale("so")}
              lang="so"
              aria-pressed={locale === "so"}
              className={`px-2.5 py-1.5 ${locale === "so" ? "bg-brand-green text-white" : "bg-white text-slate-600 hover:text-slate-900"}`}
            >
              SO
            </button>
          </div>

          {user ? (
            <div className="flex items-center gap-2">
              <span className="max-w-[160px] truncate text-xs text-slate-500">
                {fullName || user.email}
              </span>
              <button onClick={signOut} className="btn-outline !px-3 !py-1.5 !text-xs">
                {t.nav.signOut}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href={`/${locale}/auth/sign-in`} className="btn-outline !px-3 !py-1.5 !text-xs">
                {t.nav.signIn}
              </Link>
              <Link href={`/${locale}/auth/sign-up`} className="btn-primary !px-3 !py-1.5 !text-xs">
                {t.nav.signUp}
              </Link>
            </div>
          )}
        </div>

        <button
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="text-sm font-medium text-slate-700">
                {l.label}
              </Link>
            ))}
            {dashboards.map((l) => (
              <Link key={l.href} href={l.href} className="text-sm font-medium text-brand-blue">
                {l.label}
              </Link>
            ))}
            <div className="flex overflow-hidden rounded-lg border border-slate-300 text-xs font-semibold" role="group" aria-label={t.nav.language}>
              <button
                onClick={() => switchLocale("en")}
                lang="en"
                aria-pressed={locale === "en"}
                className={`flex-1 px-3 py-2 ${locale === "en" ? "bg-brand-green text-white" : "bg-white text-slate-600"}`}
              >
                EN
              </button>
              <button
                onClick={() => switchLocale("so")}
                lang="so"
                aria-pressed={locale === "so"}
                className={`flex-1 px-3 py-2 ${locale === "so" ? "bg-brand-green text-white" : "bg-white text-slate-600"}`}
              >
                SO
              </button>
            </div>
            {user ? (
              <button onClick={signOut} className="btn-outline w-full !text-xs">
                {t.nav.signOut}
              </button>
            ) : (
              <div className="flex gap-2">
                <Link href={`/${locale}/auth/sign-in`} className="btn-outline flex-1 !text-xs">
                  {t.nav.signIn}
                </Link>
                <Link href={`/${locale}/auth/sign-up`} className="btn-primary flex-1 !text-xs">
                  {t.nav.signUp}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
