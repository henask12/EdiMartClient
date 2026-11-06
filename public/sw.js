/* EdiMart service worker — app shell + POS catalog cache (Phase 9). */
const SHELL_CACHE = "edimart-shell-v2";
const DATA_CACHE = "edimart-data-v2";

const SHELL_URLS = [
  "/",
  "/pos",
  "/login",
  "/offline",
  "/manifest.webmanifest",
  "/logo.png",
  "/logo-light.png",
];

const CATALOG_PATH = "/api/proxy/products";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

const isCatalogRequest = (url) =>
  url.origin === self.location.origin && url.pathname === CATALOG_PATH;

/** Logos + manifest only — never cache /_next (dev chunks are not content-hashed stably). */
const isStaticAsset = (url) =>
  url.origin === self.location.origin &&
  (url.pathname.startsWith("/logo") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/sw.js");

const isNextAsset = (url) =>
  url.origin === self.location.origin && url.pathname.startsWith("/_next/");

const isDocumentNav = (request) =>
  request.mode === "navigate" ||
  (request.method === "GET" &&
    (request.headers.get("accept") || "").includes("text/html"));

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Always hit the network for Next bundles (avoids stale Button/Slot in local dev).
  if (isNextAsset(url)) return;

  if (isCatalogRequest(url)) {
    event.respondWith(networkFirstData(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  if (isDocumentNav(request)) {
    event.respondWith(networkFirstDocument(request));
  }
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(cacheName);
      void cache.put(request, res.clone());
    }
    return res;
  } catch {
    return (
      (await caches.match(request)) ||
      new Response("Offline", { status: 503, statusText: "Offline" })
    );
  }
}

async function networkFirstData(request) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(DATA_CACHE);
      void cache.put(request, res.clone());
    }
    return res;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ message: "Offline catalog unavailable" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }
}

async function networkFirstDocument(request) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(SHELL_CACHE);
      void cache.put(request, res.clone());
    }
    return res;
  } catch {
    const cached =
      (await caches.match(request)) ||
      (await caches.match("/pos")) ||
      (await caches.match("/")) ||
      (await caches.match("/offline"));
    if (cached) return cached;
    return new Response(
      "<!doctype html><title>Offline</title><p>EdiMart is offline. Open POS when you reconnect.</p>",
      { status: 503, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }
}
