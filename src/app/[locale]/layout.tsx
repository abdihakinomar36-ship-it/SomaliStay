import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FormStateRestorer from "@/components/FormStateRestorer";
import { createClient } from "@/lib/supabase/server";

export function generateStaticParams() {
  return ["en", "so"].map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const locale = isLocale(params.locale) ? params.locale : "en";
  const t = getDictionary(locale);
  return {
    title: {
      default: `${t.brand.name} — ${t.brand.tagline}`,
      template: `%s | ${t.brand.name}`,
    },
    description:
      locale === "so"
        ? "Hel oo ballanso hoteello la hubiyay Soomaaliya oo dhan. U dir codsi dalbasho xiriirka hoteelka."
        : "Find and book verified hotels across Somalia. Send booking requests, hear back directly from hotels.",
    alternates: {
      canonical: `/${locale}`,
      languages: { en: "/en", so: "/so" },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = getDictionary(locale);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: "guest" | "partner" | "admin" | null = null;
  let fullName: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();
    role = profile?.role ?? "guest";
    fullName = profile?.full_name ?? null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar locale={locale} t={t} user={user ? { id: user.id, email: user.email ?? "" } : null} role={role} fullName={fullName} />
      <main className="flex-1">{children}</main>
      <Footer locale={locale} t={t} />
      <FormStateRestorer />
    </div>
  );
}
