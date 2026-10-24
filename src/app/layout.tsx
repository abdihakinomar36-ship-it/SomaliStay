import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { defaultLocale } from "@/lib/i18n/config";

export const metadata: Metadata = {
  title: "SomaliStay — Verified hotels across Somalia",
  description:
    "Find and book verified hotels across Somalia. Send booking requests, hear back directly from hotels.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const localeHeader = (await headers()).get("x-somalistay-locale");
  return (
    <html lang={localeHeader === "so" ? "so" : defaultLocale}>
      <body>{children}</body>
    </html>
  );
}
