/* global self, caches, fetch, URL, Response */
/**
 * Service worker de ParkVision (HU-32). Lo genera el plugin `parkvisionPwa` de vite.config.ts al hacer
 * `pnpm build`: reemplaza __PRECACHE__ por la lista de archivos del build y __VERSION__ por su hash.
 *
 * - Instalación: precachea el app shell (index.html, JS, CSS, íconos), incluido el chunk de la Ayuda,
 *   para que las preguntas frecuentes se puedan consultar sin conexión.
 * - Navegación (rutas de la SPA): red primero; sin red, el index.html de la caché.
 * - /assets/* (con hash, inmutables): caché primero.
 * - La API (/api, otros orígenes) no se cachea nunca: los datos de ocupación deben ser frescos.
 */
const VERSION = '__VERSION__'
const CACHE = `parkvision-shell-${VERSION}`
const PRECACHE = __PRECACHE__

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('parkvision-shell-') && k !== CACHE).map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/index.html').then((cached) => cached || Response.error()),
      ),
    )
    return
  }

  if (url.pathname.startsWith('/assets/') || PRECACHE.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      })),
    )
  }
})
