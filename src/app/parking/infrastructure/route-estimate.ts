import { importLibrary } from '@googlemaps/js-api-loader'
import { loadGoogleMaps } from '../../shared/infrastructure/maps-loader'
import type { LatLng } from '../domain/geo'

export interface RouteEstimate {
  distanceMeters:  number
  durationSeconds: number
}

/** Si la API de rutas no contesta en este tiempo, se informa que no está disponible (HU-26 E2). */
const ROUTE_TIMEOUT_MS = 5_000

/**
 * Distancia y tiempo en auto desde `origin` hasta `destination` (HU-26). Usa `Route.computeRoutes`
 * (Routes API): `DirectionsService` está deprecado desde feb-2026 y los proyectos nuevos de Google
 * Cloud no tienen habilitada la Directions API legacy. Requiere la Routes API habilitada para la key.
 * Rechaza si la API falla, no encuentra ruta o tarda más de 5 s.
 */
export async function estimateDrivingRoute(origin: LatLng, destination: LatLng): Promise<RouteEstimate> {
  const route = (async () => {
    await loadGoogleMaps()
    const { Route } = (await importLibrary('routes')) as google.maps.RoutesLibrary
    const { routes } = await Route.computeRoutes({
      origin,
      destination,
      travelMode: 'DRIVING' as google.maps.TravelMode,
      fields: ['distanceMeters', 'durationMillis'],
    })
    const best = routes?.[0]
    if (best?.distanceMeters == null || best.durationMillis == null) throw new Error('Sin ruta')
    return { distanceMeters: best.distanceMeters, durationSeconds: Math.round(best.durationMillis / 1000) }
  })()
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Tiempo de espera agotado')), ROUTE_TIMEOUT_MS),
  )
  return Promise.race([route, timeout])
}
