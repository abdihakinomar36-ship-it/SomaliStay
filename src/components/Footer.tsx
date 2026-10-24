import Link from "next/link";
import Logo from "./Logo";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/en";

export default function Footer({ locale, t }: { locale: Locale; t: Dictionary }) {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="container-page grid grid-cols-1 gap-8 py-10 sm:grid-cols-3">
        <div className="flex flex-col gap-3">
          <Logo className="h-8 w-auto" />
          <p className="max-w-xs text-xs leading-relaxed text-slate-500">{t.footer.noPayment}</p>
          <p className="text-xs text-slate-400">{t.home.trustBody}</p>
        </div>
        <nav aria-label={t.nav.hotels} className="flex flex-col gap-2 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t.nav.hotels}
          </span>
          <Link href={`/${locale}/hotels`} className="text-slate-600 hover:text-brand-green">
            {t.nav.hotels}
          </Link>
          <Link href={`/${locale}/hotels`} className="text-slate-600 hover:text-brand-green">
            {t.home.popularDestinations}
          </Link>
          <Link href={`/${locale}/auth/sign-in`} className="text-slate-600 hover:text-brand-green">
            {t.nav.myBookings}
          </Link>
        </nav>
        <nav aria-label={t.footer.forHotels} className="flex flex-col gap-2 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t.footer.forHotels}
          </span>
          <Link href={`/${locale}/partner`} className="text-slate-600 hover:text-brand-green">
            {t.home.partnerCtaButton}
          </Link>
          <Link href={`/${locale}/auth/sign-up?intent=partner`} className="text-slate-600 hover:text-brand-green">
            {t.nav.signUp}
          </Link>
        </nav>
      </div>
      <div className="border-t border-slate-200">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} SomaliStay. {t.footer.rights}
          </p>
          <p>{t.footer.aboutVerified}</p>
        </div>
      </div>
    </footer>
  );
}
