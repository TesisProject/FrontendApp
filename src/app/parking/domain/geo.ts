export interface LatLng {
  lat: number
  lng: number
}

const EARTH_RADIUS_M = 6_371_000

/** Distancia en línea recta (gran círculo) entre dos puntos, en metros. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const rad = (deg: number) => (deg * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** "350 m", "1,2 km", "15 km". */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.max(1, Math.round(meters / 10) * 10)} m`
  const km = meters / 1000
  return `${km.toLocaleString('es-PE', { maximumFractionDigits: km < 10 ? 1 : 0 })} km`
}

/** Radios del filtro de distancia (HU-10), en km. */
export const RADIUS_OPTIONS_KM = [0.5, 1, 2, 5] as const

/** Radio con el que arranca "Cerca de mí" (HU-07). */
export const DEFAULT_RADIUS_KM = 2

/** El siguiente radio más amplio para "ampliar la búsqueda", o `null` si ya es el mayor. */
export function widerRadius(km: number): number | null {
  return RADIUS_OPTIONS_KM.find(r => r > km) ?? null
}

/** "500 m", "1 km", "2 km". */
export function formatRadius(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toLocaleString('es-PE')} km`
}

/**
 * Filtra y ordena por distancia cualquier lista con coordenadas: es el respaldo en el navegador de
 * `GET /parking/zones/nearby` (mismo haversine) si el backend no responde.
 */
export function withinRadius<T extends { id: number; latitude: number; longitude: number }>(
  items: T[],
  origin: LatLng,
  radiusKm: number,
): Map<number, number> {
  const distances = new Map<number, number>()
  items
    .filter(i => i.latitude !== 0 || i.longitude !== 0)
    .map(i => [i.id, haversineMeters(origin, { lat: i.latitude, lng: i.longitude })] as const)
    .filter(([, d]) => d <= radiusKm * 1000)
    .sort((a, b) => a[1] - b[1])
    .forEach(([id, d]) => distances.set(id, d))
  return distances
}
