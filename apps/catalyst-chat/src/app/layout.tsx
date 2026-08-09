import type { Metadata, Viewport } from "next";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a1a" },
  ],
};

export const metadata: Metadata = {
  title: "Catalyst AI — BELL 13450.50",
  description:
    "Banca Autopoiética y Sistema de Conocimiento — Pentetraktys 4D + Boo Compiler + Zettelkasten + COBOL Empresarial",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Catalyst AI",
    statusBarStyle: "black-translucent",
    startupImage: [
      // iPhone 15/16 Pro Max (430x932)
      {
        url: "/icon-512.png",
        media:
          "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPhone 14/15 Pro (393x852)
      {
        url: "/icon-512.png",
        media:
          "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPhone 12/13 (390x844)
      {
        url: "/icon-512.png",
        media:
          "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)",
      },
      // iPhone X/XS/11 Pro (375x812)
      {
        url: "/icon-512.png",
        media:
          "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)",
      },
    ],
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "180x180", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Catalyst AI",
    "format-detection": "telephone=no, date=no, email=no, address=no",
    "msapplication-TileColor": "#f4f4f0",
    "msapplication-TileImage": "/icon-192.png",
    "msapplication-config": "none",
    "application-name": "Catalyst AI",
    "referrer": "strict-origin-when-cross-origin",
    "HandheldFriendly": "true",
  },
};

// ═══════════════════════════════════════════════════════════════
// INLINE SCRIPT: Service Worker + Auto-Reconexión + WakeLock
// ═══════════════════════════════════════════════════════════════
const BOOT_SCRIPT = `
(function(){
  // ── Detectar standalone (PWA instalada) ──────────────────────
  var isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || navigator.standalone
    || window.name === 'catalyst-standalone';

  // ── Registrar Service Worker ────────────────────────────────
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then(function(reg) {
        console.log('[PWA] SW registrado:', reg.scope);

        // Detectar actualización del SW
        reg.addEventListener('updatefound', function() {
          var newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', function() {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] Nueva versión disponible — aplicando');
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              // Recargar cuando el nuevo SW tome control
              navigator.serviceWorker.addEventListener('controllerchange', function() {
                window.location.reload();
              });
            }
          });
        });

        // Escuchar mensajes del SW (heartbeat, push)
        navigator.serviceWorker.addEventListener('message', function(event) {
          if (event.data && event.data.type === 'heartbeat') {
            // SW sigue vivo — no action needed
          }
        });

        // Iniciar keep-alive en el SW
        if (reg.active) {
          reg.active.postMessage({ type: 'start_keepalive' });
        }
      })
      .catch(function(err) {
        console.warn('[PWA] SW falló:', err);
      });
  }

  // ── Wake Lock: Mantener pantalla encendida (iOS 16.4+) ─────
  var wakeLock = null;
  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator && document.visibilityState === 'visible') {
        wakeLock = await navigator.wakeLock.request('screen');
        console.log('[PWA] WakeLock activo');
      }
    } catch(e) { /* no soportado o denegado */ }
  }
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') requestWakeLock();
  });
  requestWakeLock();

  // ── Auto-reconexión al chat si se cae la conexión ──────────
  var reconnectAttempts = 0;
  function checkConnection() {
    fetch('/api/chats', { method: 'GET', signal: AbortSignal.timeout(5000) })
      .then(function(r) {
        if (r.ok) { reconnectAttempts = 0; return; }
        throw new Error('server error');
      })
      .catch(function() {
        reconnectAttempts++;
        var delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempts));
        console.log('[PWA] Reconexión en ' + delay/1000 + 's (intento ' + reconnectAttempts + ')');
        setTimeout(checkConnection, delay);
      });
  }
  // Checar conexión cada 30s
  setInterval(checkConnection, 30000);

  // ── Reportar diagnóstico ────────────────────────────────────
  function report(type, msg) {
    try {
      var data = JSON.stringify({ type: type, msg: String(msg).slice(0,500), ua: navigator.userAgent.slice(0,120), url: location.pathname, t: Date.now(), standalone: isStandalone });
      if (navigator.sendBeacon) { navigator.sendBeacon('/api/clientlog', data); }
      else { fetch('/api/clientlog', { method: 'POST', body: data, keepalive: true }).catch(function(){}); }
    } catch(e){}
  }

  // ── Global error handlers ──────────────────────────────────
  window.addEventListener('error', function(e){
    var t = e.target || {};
    if (t && (t.src || t.href)) { report('resource-error', (t.tagName||'') + ' ' + (t.src||t.href)); }
    else { report('js-error', (e.message||'') + ' @ ' + (e.filename||'') + ':' + (e.lineno||'')); }
  }, true);
  window.addEventListener('unhandledrejection', function(e){
    report('promise-rejection', e.reason && (e.reason.message || e.reason));
  });

  // ── Console error guard ────────────────────────────────────
  var errCount = 0;
  var origErr = console.error;
  console.error = function(){
    if (errCount++ < 5) {
      try { report('console-error', Array.prototype.slice.call(arguments).map(String).join(' ').slice(0,400)); } catch(x){}
    }
    return origErr.apply(console, arguments);
  };

  // ── Marcar como standalone para recargas ───────────────────
  if (isStandalone) { window.name = 'catalyst-standalone'; }

  // ── Sonda de sesión ────────────────────────────────────────
  setTimeout(function(){
    fetch('/api/auth/session', { credentials: 'same-origin' })
      .then(function(r){ return r.text().then(function(t){ report('sonda-session', 'HTTP ' + r.status + ' body:' + t.slice(0,120)); }); })
      .catch(function(e){ report('sonda-session', 'FALLO: ' + (e && e.message)); });
  }, 3000);

  // ── Estado de hidratación ──────────────────────────────────
  function estado(tag){
    var el = document.querySelector('p');
    var hydrated = !!(window.next || document.querySelector('[data-reactroot]') || (window.__next_f && window.__next_f.length));
    report(tag, (el ? el.textContent : '(sin p)') + ' | hydrated:' + hydrated + ' | standalone:' + isStandalone + ' | scripts:' + document.scripts.length);
  }
  setTimeout(function(){ estado('estado-4s'); }, 4000);
  setTimeout(function(){ estado('estado-9s'); }, 9000);
  window.addEventListener('load', function(){
    report('load', 'window.load OK | scripts:' + document.scripts.length + ' | standalone:' + isStandalone);
  });

  report('boot', 'Catalyst PWA v2 iniciada | standalone:' + isStandalone + ' | ' + navigator.userAgent.slice(0,80));
  console.log('◆ Catalyst AI PWA — BELL 13450.50 — v2 iPhone');
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* ── PWA Meta Tags ────────────────────────────── */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Catalyst AI" />
        <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />
        <meta name="HandheldFriendly" content="true" />

        {/* ── Apple Touch Icons ───────────────────────── */}
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-192.png" />
        <link rel="apple-touch-startup-image" href="/icon-512.png" />

        {/* ── Microsoft Tile ──────────────────────────── */}
        <meta name="msapplication-TileColor" content="#f4f4f0" />
        <meta name="msapplication-TileImage" content="/icon-192.png" />

        {/* ── Tema / Color ────────────────────────────── */}
        <meta name="theme-color" content="#f4f4f0" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0a0a1a" media="(prefers-color-scheme: dark)" />

        {/* ── Favicon ─────────────────────────────────── */}
        <link rel="icon" href="/icon-192.png" />
        <link rel="shortcut icon" href="/icon-192.png" />

        {/* ── Service Worker + Auto-Reconexión + WakeLock ── */}
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      </head>
      <body className="bg-[#f4f4f0]">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
