// ═══════════════════════════════════════════════════════════════════════
// Catalyst AI — Service Worker PWA iPhone
// BELL 13450.50 | Pentetraktys 4D | OSHIRO ERC-26+
// ═══════════════════════════════════════════════════════════════════════
// Estrategia: Cache-First (carga instantánea) + Background Sync (siempre vivo)

const CACHE_NAME = "catalyst-ai-v2";
const RUNTIME_CACHE = "catalyst-runtime-v2";

// ─── Recursos que se cachean al instalar ─────────────────────────
const PRE_CACHE = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

// ─── Instalación: precache de shell ──────────────────────────────
self.addEventListener("install", (event) => {
  console.log("[SW] Install — Catalyst AI PWA");
  (event as any).waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Precaching shell");
      return cache.addAll(PRE_CACHE);
    })
  );
  // Activar inmediatamente (no esperar a que cierren pestañas viejas)
  (self as any).skipWaiting();
});

// ─── Activación: limpiar caches viejos ──────────────────────────
self.addEventListener("activate", (event) => {
  console.log("[SW] Activate — Catalyst AI PWA");
  (event as any).waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  // Tomar control de todos los clientes inmediatamente
  (self as any).clients.claim();
});

// ─── Fetch: Cache-First (app shell + API bypass) ─────────────────
self.addEventListener("fetch", (event) => {
  const req = (event as any).request;
  const url = new URL(req.url);

  // NO cachear llamadas API (siempre ir a red)
  if (url.pathname.startsWith("/api/")) {
    return; // dejar pasar a la red normalmente
  }

  // NO cachear solicitudes de chrome-extension ni analytics
  if (
    url.protocol === "chrome-extension:" ||
    url.hostname.includes("analytics") ||
    url.hostname.includes("telemetry")
  ) {
    return;
  }

  // Cache-First para recursos estáticos
  (event as any).respondWith(
    caches.match(req).then((cached) => {
      // Devolver del cache, y actualizar en segundo plano
      const fetchPromise = fetch(req)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, clone));
          }
          return response;
        })
        .catch(() => cached); // si red falla, devolver cached

      return cached || fetchPromise;
    })
  );
});

// ─── Keep-Alive: Heartbeat cada 60s para mantenerse vivo ─────────
// iPhone suspende el SW tras ~30s de inactividad. Este heartbeat
// fuerza actividad periódica para mantenerlo despierto.
let keepAliveInterval: any = null;

function startKeepAlive() {
  if (keepAliveInterval) return;
  console.log("[SW] Keep-Alive iniciado (intervalo 55s)");
  keepAliveInterval = setInterval(() => {
    // Touch interno para mantener vivo el SW
    console.log("[SW] ♡ heartbeat");
    // Notificar a los clients que el SW sigue vivo
    (self as any).clients.matchAll({ type: "window" }).then((clients: any[]) => {
      clients.forEach((client) => {
        client.postMessage({ type: "heartbeat", ts: Date.now() });
      });
    });
  }, 55000); // 55s — por debajo del umbral de suspensión de iOS (~60s)
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

startKeepAlive();

// ─── Mensajes desde la app ──────────────────────────────────────
self.addEventListener("message", (event) => {
  const data = (event as any).data;
  switch (data?.type) {
    case "SKIP_WAITING":
      (self as any).skipWaiting();
      break;
    case "CHECK_UPDATE":
      caches.keys().then((keys) => {
        (event as any).ports?.[0]?.postMessage({ caches: keys });
      });
      break;
    case "CLEAR_CACHE":
      caches.keys().then((keys) =>
        Promise.all(keys.map((k) => caches.delete(k)))
      );
      break;
    case "start_keepalive":
      startKeepAlive();
      break;
    case "stop_keepalive":
      stopKeepAlive();
      break;
  }
});

// ─── Push notifications (preparado) ─────────────────────────────
self.addEventListener("push", (event) => {
  const data = (event as any).data?.json() || {};
  const title = data.title || "Catalyst AI";
  const options = {
    body: data.body || "Nueva respuesta disponible",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: data.url || "/",
    vibrate: [100, 50, 100],
    requireInteraction: true,
  };
  (event as any).waitUntil(
    (self as any).registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  (event as any).notification.close();
  (event as any).waitUntil(
    (self as any).clients
      .matchAll({ type: "window" })
      .then((clients: any[]) => {
        const url = (event as any).notification.data || "/";
        for (const client of clients) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        if ((self as any).clients.openWindow) {
          return (self as any).clients.openWindow(url);
        }
      })
  );
});

console.log("[SW] Catalyst AI PWA — Service Worker Activo ◆ BELL 13450.50");
