import type { LatLng } from './geo'

/** Coordenadas utilizables: ni ausentes, ni 0,0 (zona sin ubicar), ni fuera de rango. */
export function hasValidCoords(lat: number | null | undefined, lng: number | null | undefined): boolean {
  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) return false
  if (lat === 0 && lng === 0) return false
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180
}

/** Deep link de Waze que abre la navegación hacia el destino (HU-29). */
export function wazeUrl(dest: LatLng): string {
  return `https://waze.com/ul?ll=${dest.lat},${dest.lng}&navigate=yes`
}

/** Alternativa en Google Maps: ruta en auto desde la ubicación actual (o `origin`) hasta el destino. */
export function googleMapsDirectionsUrl(dest: LatLng, origin?: LatLng | null): string {
  const params = new URLSearchParams({ api: '1', destination: `${dest.lat},${dest.lng}`, travelmode: 'driving' })
  if (origin) params.set('origin', `${origin.lat},${origin.lng}`)
  return `https://www.google.com/maps/dir/?${params}`
}

/** "8 min", "1 h 05 min". */
export function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h} h ${String(m).padStart(2, '0')} min`
}
