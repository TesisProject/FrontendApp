/**
 * Arma el `sw.js` final a partir de la plantilla `pwa/service-worker.js` (HU-32).
 *
 * Reemplaza todas las apariciones de los marcadores, no solo la primera: con `String.replace` se
 * cambiaba el marcador del comentario de cabecera y el del código quedaba sin reemplazar, así que
 * `const PRECACHE = __PRECACHE__` lanzaba un ReferenceError, el navegador rechazaba el service worker
 * y la Ayuda no se podía abrir sin conexión (CP016, CP068).
 */
export const PRECACHE_PLACEHOLDER = '__PRECACHE__'
export const VERSION_PLACEHOLDER = '__VERSION__'

export function renderServiceWorker(template: string, precache: string[], version: string): string {
  return template
    .replaceAll(VERSION_PLACEHOLDER, version)
    .replaceAll(PRECACHE_PLACEHOLDER, JSON.stringify(precache))
}
