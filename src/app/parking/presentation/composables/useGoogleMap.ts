import { ref, watch, onUnmounted, type Ref } from 'vue'
import { loadGoogleMaps } from '../../../shared/infrastructure/maps-loader'
import { classificationColor } from '../../domain/zone-classification'
import type { Zone } from '../../domain/model/zone.model'
import type { LatLng } from '../../domain/geo'

const LIMA_CENTER = { lat: -12.0464, lng: -77.0428 }
const DEFAULT_ZOOM = 12
const FOCUS_ZOOM = 16

interface MarkerEntry {
  marker: google.maps.marker.AdvancedMarkerElement
  pin: HTMLElement
  zone: Zone
}

interface UseGoogleMapOptions {
  mapRef: Ref<HTMLElement | null>
  zones: Ref<Zone[]>
  onMarkerEnter: (zone: Zone, event: MouseEvent) => void
  onMarkerLeave: (zone: Zone) => void
  /**
   * Click o tap en el marcador (HU-06): en pantallas táctiles no hay hover, así que el tap es la
   * única forma de abrir el resumen de la zona.
   */
  onMarkerClick?: (zone: Zone, event: MouseEvent) => void
  /** Click/tap en el mapa fuera de un marcador (p. ej. para cerrar el resumen). */
  onMapClick?: () => void
}

function createPinElement(zone: Zone): HTMLElement {
  const pin = document.createElement('div')
  pin.style.cssText = `
    width: 22px; height: 22px; border-radius: 50%;
    background: ${classificationColor(zone.classification)};
    border: 2.5px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    cursor: pointer;
  `
  return pin
}

/** Zonas con coordenadas reales (una zona sin ubicar llega en 0,0). */
function locatedZones(zones: Zone[]): Zone[] {
  return zones.filter((z) => z.latitude !== 0 || z.longitude !== 0)
}

export function useGoogleMap(options: UseGoogleMapOptions) {
  const mapError = ref<string | null>(null)
  let map: google.maps.Map | null = null
  const markers = new Map<number, MarkerEntry>()
  // El encuadre inicial se hace una sola vez: los refrescos periódicos no deben mover el mapa.
  let fitted = false

  /** Abre el mapa sobre las zonas: una sola se centra con zoom de calle; varias se encuadran todas. */
  function fitToZones() {
    if (!map || fitted) return
    const zones = locatedZones(options.zones.value)
    if (zones.length === 0) return
    fitted = true
    if (zones.length === 1) {
      map.setCenter({ lat: zones[0].latitude, lng: zones[0].longitude })
      map.setZoom(FOCUS_ZOOM)
      return
    }
    const bounds = new google.maps.LatLngBounds()
    zones.forEach((z) => bounds.extend({ lat: z.latitude, lng: z.longitude }))
    map.fitBounds(bounds, 64)
  }

  function syncMarkers() {
    if (!map) return
    const nextIds = new Set(options.zones.value.map((z) => z.id))

    // Remover los marcadores cuyas zonas ya no están presentes.
    for (const [id, entry] of markers) {
      if (!nextIds.has(id)) {
        entry.marker.map = null
        markers.delete(id)
      }
    }

    // Crear los nuevos y actualizar in-place los existentes.
    options.zones.value.forEach((zone) => {
      const existing = markers.get(zone.id)
      if (existing) {
        updateMarker(existing, zone)
      } else {
        markers.set(zone.id, createMarker(zone))
      }
    })
    fitToZones()
  }

  function createMarker(zone: Zone): MarkerEntry {
    const pin = createPinElement(zone)
    const marker = new google.maps.marker.AdvancedMarkerElement({
      position: { lat: zone.latitude, lng: zone.longitude },
      map,
      title: zone.name,
      content: pin,
    })

    const entry: MarkerEntry = { marker, pin, zone }

    // Los listeners leen `entry.zone`, que se mantiene fresco en updateMarker.
    pin.addEventListener('mouseenter', (e: MouseEvent) =>
      options.onMarkerEnter(entry.zone, e),
    )
    pin.addEventListener('mouseleave', () => options.onMarkerLeave(entry.zone))
    // `click` también se dispara con un tap; se detiene para que el mapa no lo tome como click propio.
    pin.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation()
      options.onMarkerClick?.(entry.zone, e)
    })

    return entry
  }

  function updateMarker(entry: MarkerEntry, zone: Zone) {
    entry.zone = zone
    entry.pin.style.background = classificationColor(zone.classification)
    entry.marker.position = { lat: zone.latitude, lng: zone.longitude }
    entry.marker.title = zone.name
  }

  function clearMarkers() {
    for (const entry of markers.values()) entry.marker.map = null
    markers.clear()
  }

  async function init() {
    try {
      await loadGoogleMaps()
      map = new google.maps.Map(options.mapRef.value!, {
        center: LIMA_CENTER,
        zoom: DEFAULT_ZOOM,
        mapId: 'DEMO_MAP_ID',
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        zoomControlOptions: {
          position: google.maps.ControlPosition.RIGHT_CENTER,
        },
      })
      map.addListener('click', () => options.onMapClick?.())
      syncMarkers()
    } catch (err: unknown) {
      console.error('[Map] error al cargar Google Maps:', err)
      mapError.value =
        'No se pudo cargar el mapa. Verifica tu conexión e inténtalo de nuevo.'
    }
  }

  function panTo(
    location: google.maps.LatLng | google.maps.LatLngLiteral,
    zoom = FOCUS_ZOOM,
  ) {
    if (!map) return
    map.panTo(location)
    map.setZoom(zoom)
  }

  function focusZone(zone: Zone) {
    panTo({ lat: zone.latitude, lng: zone.longitude }, FOCUS_ZOOM)
  }

  let userMarker: google.maps.marker.AdvancedMarkerElement | null = null
  let radiusCircle: google.maps.Circle | null = null

  /**
   * Muestra la posición del usuario y, si hay filtro de distancia, el círculo del radio (HU-07/10).
   * Con `fit` encuadra el círculo; `null` quita ambos.
   */
  function showUserArea(position: LatLng | null, radiusKm: number | null, fit = false) {
    if (!map) return
    if (!position) {
      if (userMarker) userMarker.map = null
      radiusCircle?.setMap(null)
      userMarker = null
      radiusCircle = null
      return
    }
    if (!userMarker) {
      const dot = document.createElement('div')
      dot.style.cssText = `
        width: 16px; height: 16px; border-radius: 50%; background: #2b6cb0;
        border: 3px solid white; box-shadow: 0 0 0 6px rgba(43,108,176,0.22);
      `
      userMarker = new google.maps.marker.AdvancedMarkerElement({ map, content: dot, title: 'Tu ubicación', zIndex: 1000 })
    }
    userMarker.position = position
    if (radiusKm == null) {
      radiusCircle?.setMap(null)
      radiusCircle = null
      return
    }
    if (!radiusCircle) {
      radiusCircle = new google.maps.Circle({
        map, clickable: false, strokeColor: '#2b6cb0', strokeOpacity: 0.5, strokeWeight: 1.5,
        fillColor: '#2b6cb0', fillOpacity: 0.06,
      })
    }
    radiusCircle.setCenter(position)
    radiusCircle.setRadius(radiusKm * 1000)
    if (fit) {
      const bounds = radiusCircle.getBounds()
      if (bounds) map.fitBounds(bounds, 32)
    }
  }

  // Reconciliación incremental ante cualquier cambio del listado filtrado.
  watch(options.zones, syncMarkers)

  onUnmounted(() => {
    clearMarkers()
    showUserArea(null, null)
  })

  return { mapError, init, panTo, focusZone, showUserArea }
}
