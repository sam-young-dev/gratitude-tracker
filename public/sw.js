// Service worker for the installable app.
//
// Deliberately conservative: journal pages and data are private and
// server-rendered per user, so they are never cached. Only content-hashed build
// assets (immutable) and the offline fallback live in the cache.
//   - /assets/*     cache-first (filenames change whenever content changes)
//   - navigations   network-first, falling back to /offline.html
//   - everything else (auth, API, server functions) passes straight through

const VERSION = 'v1'
const STATIC_CACHE = `static-${VERSION}`
const ASSET_CACHE = 'assets'
const PRECACHE = ['/offline.html', '/favicon.svg', '/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/offline.html', { cacheName: STATIC_CACHE }),
      ),
    )
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      }),
    )
  }
})
