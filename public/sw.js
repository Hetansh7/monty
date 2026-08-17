// Minimal, deliberately boring service worker.
// Its only jobs: make the app installable on phones, and show a cached
// shell if the network dies mid-session. It is network-FIRST on purpose —
// an aggressive cache is the #1 cause of "I deployed but see the old app".
const CACHE = "ascend-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(["/manifest.webmanifest", "/icon.svg"]).catch(() => undefined)
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Never touch Supabase / other origins — auth and data must always be live.
  if (url.origin !== self.location.origin) return;
  // Never cache Next.js build internals.
  if (url.pathname.startsWith("/_next/")) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy).catch(() => undefined));
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || Response.error()))
  );
});
