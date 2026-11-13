// Service worker for the installable app.
//
// Deliberately conservative: journal pages and data are private and
// server-rendered per user, so they are never cached. Only content-hashed build
// assets (immutable) and the offline fallback live in the cache.
//   - /assets/*     cache-first (filenames change whenever content changes)
//   - navigations   network-first, falling back to /offline.html. If the
//                   server is slow (a cold start), /loading.html is shown while
//                   the real response finishes; see handleNavigation.
//   - everything else (auth, API, server functions) passes straight through

const VERSION = 'v2'
const STATIC_CACHE = `static-${VERSION}`
const ASSET_CACHE = 'assets'
const PRECACHE = [
  '/offline.html',
  '/loading.html',
  '/favicon.svg',
  '/icon-192.png',
]
// How long a navigation may take before the loading screen is shown.
const LOADING_DELAY_MS = 400

// Navigations that outran LOADING_DELAY_MS, keyed by URL. The loading page
// waits on its entry, then navigates again and is handed this response, so
// the server is only asked once.
const pending = new Map()

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

  if (url.pathname === '/__sw/wait') {
    event.respondWith(waitForPending(url.searchParams.get('url')))
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(event))
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

const offline = () => caches.match('/offline.html', { cacheName: STATIC_CACHE })

async function handleNavigation(event) {
  const { request } = event

  // The loading page navigating back: hand over the response it waited for.
  const inFlight = pending.get(request.url)
  if (inFlight) {
    pending.delete(request.url)
    return inFlight.catch(offline)
  }

  const response = fetch(request)
  const slow = new Promise((resolve) =>
    setTimeout(resolve, LOADING_DELAY_MS, 'slow'),
  )
  const first = await Promise.race([response, slow]).catch(() => null)
  if (first === null) return offline()
  if (first !== 'slow') return first

  const loading = await caches.match('/loading.html', {
    cacheName: STATIC_CACHE,
  })
  if (!loading) return response.catch(offline)

  pending.set(request.url, response)
  // Keep the worker alive until the response lands, and drop it if the
  // loading page never comes back for it.
  event.waitUntil(
    response
      .catch(() => {})
      .then(() => new Promise((resolve) => setTimeout(resolve, 30_000)))
      .then(() => {
        if (pending.get(request.url) === response) pending.delete(request.url)
      }),
  )
  return loading
}

async function waitForPending(target) {
  const inFlight = target && pending.get(target)
  if (inFlight) await inFlight.catch(() => {})
  return new Response(null, {
    status: 204,
    headers: { 'Cache-Control': 'no-store' },
  })
}
