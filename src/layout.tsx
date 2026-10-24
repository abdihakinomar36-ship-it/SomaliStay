import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SomaliStay | Hotels Across Somalia",
  description: "Discover hotels across Somalia and send booking requests directly to hotel partners."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="so"><body>{children}</body></html>;
}
