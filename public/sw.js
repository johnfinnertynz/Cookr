const CACHE_NAME = 'cookr-shell-v5'
const scopeUrl = self.registration.scope
const rootUrl = new URL('.', scopeUrl).toString()
const SHELL_ASSETS = ['', 'manifest.webmanifest', 'favicon.svg', 'icons.svg'].map((asset) => new URL(asset, scopeUrl).toString())

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match(rootUrl)))
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status >= 500) return response
        const copy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
        return response
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match(rootUrl))),
  )
})
