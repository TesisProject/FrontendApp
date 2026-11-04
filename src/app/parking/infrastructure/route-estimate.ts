import { importLibrary } from '@googlemaps/js-api-loader'
import { loadGoogleMaps } from '../../shared/infrastructure/maps-loader'
import type { LatLng } from '../domain/geo'

export interface RouteEstimate {
  distanceMeters:  number
  durationSeconds: number
}

/** Si la API de rutas no contesta en este tiempo, se informa que no está disponible (HU-29 E2). */
const ROUTE_TIMEOUT_MS = 5_000

/**
 * Distancia y tiempo en auto desde `origin` hasta `destination` con el servicio de rutas de Google
 * Maps (HU-29). Rechaza si la API falla, no encuentra ruta o tarda más de 5 s.
 */
export async function estimateDrivingRoute(origin: LatLng, destination: LatLng): Promise<RouteEstimate> {
  const route = (async () => {
    await loadGoogleMaps()
    const { DirectionsService } = (await importLibrary('routes')) as google.maps.RoutesLibrary
    const result = await new DirectionsService().route({
      origin,
      destination,
      travelMode: 'DRIVING' as google.maps.TravelMode,
    })
    const leg = result.routes[0]?.legs[0]
    if (!leg?.distance || !leg.duration) throw new Error('Sin ruta')
    return { distanceMeters: leg.distance.value, durationSeconds: leg.duration.value }
  })()
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Tiempo de espera agotado')), ROUTE_TIMEOUT_MS),
  )
  return Promise.race([route, timeout])
}
