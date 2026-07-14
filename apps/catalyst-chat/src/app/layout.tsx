import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Catalyst AI — BELL 13450.50',
  description: 'Autopoietic Banking & Knowledge System — Pentetraktys 4D + Boo Compiler + Zettelkasten',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a1a]">{children}</body>
    </html>
  );
}
