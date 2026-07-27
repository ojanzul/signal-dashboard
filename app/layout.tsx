import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Signal Desk — Riset Sinyal Eksperimental",
  description: "Dashboard sinyal berbasis analisa AI (eksperimental, belum tervalidasi)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${mono.variable} ${sans.variable}`}>
      <body className="font-sans bg-void text-ink antialiased">{children}</body>
    </html>
  );
}
