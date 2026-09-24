<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { loadGoogleMaps } from '../../../shared/infrastructure/maps-loader'

/**
 * ZoneLocationPicker — mapa con pin ajustable para fijar la ubicación exacta
 * de una zona. v-model de `latitude` / `longitude`:
 * - clic en el mapa o arrastrar el pin → actualiza las coordenadas;
 * - cambios externos (autocompletado, inputs numéricos) → mueven el pin.
 */
const latitude  = defineModel<number>('latitude',  { default: 0 })
const longitude = defineModel<number>('longitude', { default: 0 })

const LIMA_CENTER  = { lat: -12.0464, lng: -77.0428 }
const DEFAULT_ZOOM = 12
const PLACED_ZOOM  = 17
const MIN_FOCUS_ZOOM = 15
const EPSILON = 1e-7

const mapEl    = ref<HTMLElement | null>(null)
const mapError = ref<string | null>(null)
const loading  = ref(true)

let map: google.maps.Map | null = null
let marker: google.maps.marker.AdvancedMarkerElement | null = null

const hasLocation = computed(() =>
  Number.isFinite(latitude.value) && Number.isFinite(longitude.value) &&
  !!latitude.value && !!longitude.value,
)

const round6 = (n: number) => Math.round(n * 1e6) / 1e6

function toLiteral(
  p: google.maps.LatLng | google.maps.LatLngLiteral | google.maps.LatLngAltitude | null | undefined,
): google.maps.LatLngLiteral | null {
  if (!p) return null
  return {
    lat: typeof p.lat === 'function' ? p.lat() : p.lat,
    lng: typeof p.lng === 'function' ? p.lng() : p.lng,
  }
}

function createPinElement(): HTMLElement {
  const pin = document.createElement('div')
  pin.style.cssText = `
    width: 26px; height: 26px; border-radius: 50%;
    background: #f2894a;
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    cursor: grab;
    transform: translateY(50%); /* el marcador ancla su borde inferior: así el centro del círculo cae sobre la coordenada */
  `
  return pin
}

function setCoords(pos: google.maps.LatLngLiteral) {
  latitude.value  = round6(pos.lat)
  longitude.value = round6(pos.lng)
}

function placeMarker(pos: google.maps.LatLngLiteral) {
  if (!map) return
  if (!marker) {
    marker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: pos,
      content: createPinElement(),
      gmpDraggable: true,
      title: 'Arrastra para ajustar la ubicación',
    })
    marker.addListener('dragend', () => {
      const p = toLiteral(marker?.position)
      if (p) setCoords(p)
    })
  } else {
    marker.position = pos
  }
}

function removeMarker() {
  if (marker) marker.map = null
  marker = null
}

// Sincroniza el pin con las coordenadas del formulario (autocompletado o inputs).
function syncFromModel() {
  if (!map) return
  if (!hasLocation.value) {
    removeMarker()
    return
  }
  const next = { lat: latitude.value, lng: longitude.value }
  const current = toLiteral(marker?.position)
  const unchanged = current &&
    Math.abs(current.lat - next.lat) < EPSILON &&
    Math.abs(current.lng - next.lng) < EPSILON
  if (unchanged) return

  placeMarker(next)
  map.panTo(next)
  if ((map.getZoom() ?? 0) < MIN_FOCUS_ZOOM) map.setZoom(PLACED_ZOOM)
}

async function init() {
  try {
    await loadGoogleMaps()
    const start = hasLocation.value
      ? { lat: latitude.value, lng: longitude.value }
      : LIMA_CENTER
    map = new google.maps.Map(mapEl.value!, {
      center: start,
      zoom: hasLocation.value ? PLACED_ZOOM : DEFAULT_ZOOM,
      mapId: 'DEMO_MAP_ID',
      mapTypeControl: true,
      fullscreenControl: false,
      streetViewControl: false,
      clickableIcons: false,
      gestureHandling: 'cooperative',
    })
    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      const p = toLiteral(e.latLng)
      if (!p) return
      placeMarker(p)
      setCoords(p)
    })
    if (hasLocation.value) placeMarker(start)
  } catch (err: unknown) {
    console.error('[ZoneLocationPicker] error al cargar Google Maps:', err)
    mapError.value = 'No se pudo cargar el mapa. Puedes ingresar las coordenadas manualmente.'
  } finally {
    loading.value = false
  }
}

watch([latitude, longitude], syncFromModel)

onMounted(init)
onBeforeUnmount(() => {
  removeMarker()
  map = null
})
</script>

<template>
  <div class="picker">
    <div class="picker-map-wrap">
      <div ref="mapEl" class="picker-map" />
      <div v-if="loading" class="picker-overlay">Cargando mapa...</div>
      <div v-else-if="mapError" class="picker-overlay picker-error">{{ mapError }}</div>
    </div>
    <p class="picker-hint">
      <template v-if="hasLocation">
        Arrastra el pin o haz clic en el mapa para ajustar la ubicación exacta.
      </template>
      <template v-else>
        Busca una dirección arriba o haz clic en el mapa para colocar el pin.
      </template>
    </p>
  </div>
</template>

<style scoped>
.picker { margin-bottom: 14px; }

.picker-map-wrap {
  position: relative;
  height: 260px;
  border-radius: 10px;
  overflow: hidden;
  border: 1.5px solid #e2e8f0;
  background: #eef2f7;
}
.picker-map { width: 100%; height: 100%; }

.picker-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  text-align: center;
  font-size: 13px;
  color: #6b7a8c;
  background: #eef2f7;
}
.picker-error { color: #c53030; }

.picker-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: #8a97a8;
}
</style>
