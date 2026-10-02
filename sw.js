// Mars Tee Studio - minimal service worker
// Purpose: (1) satisfy the installability requirement browsers check for
// before offering the "Install app" prompt, (2) cache the core app shell
// so the site still opens (even if just a basic shell) when offline.
// Deliberately NOT caching Supabase/API calls or dynamic content - product
// listings, reviews, and prices should always come from the network when
// available, never served stale from a cache.

const CACHE_NAME = "mts-shell-v1";
const APP_SHELL = [
    "/index.html",
    "/style.css",
    "/script.js",
    "/css/icons.css",
    "/js/icons.js",
    "/images/mars-tee-logo.png",
    "/images/icon-192.png",
    "/images/icon-512.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {
            // Shell caching is a nice-to-have - never block install if one asset 404s.
        })
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);

    if (event.request.method !== "GET" || url.origin !== self.location.origin) {
        return;
    }

    if (url.pathname.startsWith("/functions/")) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const copy = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
                return response;
            })
            .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/index.html")))
    );
});
