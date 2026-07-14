import type { Metadata, Viewport } from "next";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f4f4f0",
};

export const metadata: Metadata = {
  title: "Catalyst AI — BELL 13450.50",
  description:
    "Banca Autopoiética y Sistema de Conocimiento — Pentetraktys 4D + Boo Compiler + Zettelkasten",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Catalyst AI",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-512.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="bg-[#f4f4f0]">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
