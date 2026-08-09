import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  // Fijar la raíz del workspace: evita que Turbopack infiera la raíz del
  // monorepo por el package-lock.json externo (causa de fallos jest-worker)
  turbopack: {
    root: path.join(__dirname),
  },
  // ─── Headers personalizados ──────────────────────────────────────
  async headers() {
    return [
      // Safari iOS cachea agresivo los chunks en dev — prohibir caché
      {
        source: "/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      // Service Worker: NO cachear (debe servirse fresco siempre)
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      // Manifest: NO cachear
      {
        source: "/manifest.json",
        headers: [
          { key: "Cache-Control", value: "no-cache" },
          { key: "Content-Type", value: "application/manifest+json" },
        ],
      },
    ];
  },
};

export default nextConfig;
