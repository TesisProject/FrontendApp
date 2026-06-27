import { ref, watch, onUnmounted, type Ref } from 'vue'
import { loadGoogleMaps } from '../../../shared/infrastructure/maps-loader'
import { classificationColor } from '../../domain/zone-classification'
import type { Zone } from '../../domain/model/zone.model'

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

export function useGoogleMap(options: UseGoogleMapOptions) {
  const mapError = ref<string | null>(null)
  let map: google.maps.Map | null = null
  const markers = new Map<number, MarkerEntry>()

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

  // Reconciliación incremental ante cualquier cambio del listado filtrado.
  watch(options.zones, syncMarkers)

  onUnmounted(clearMarkers)

  return { mapError, init, panTo, focusZone }
}
