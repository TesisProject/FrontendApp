<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useZoneStore } from '../../application/zone.store'
import { useFavoriteStore } from '../../../favorites/application/favorite.store'
import { useAuthStore } from '../../../iam/application/auth.store'
import { LocateFixed, MapPin, Search, X } from '@lucide/vue'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { Input } from '@/app/shared/presentation/components/ui/input'
import FilterPills from '../../../shared/presentation/components/FilterPills.vue'
import PageHeader from '../../../shared/presentation/components/PageHeader.vue'
import StateMessage from '../../../shared/presentation/components/StateMessage.vue'
import ClassificationBadge from '../components/ClassificationBadge.vue'
import SpaceCounts from '../components/SpaceCounts.vue'
import { useGoogleMap } from '../composables/useGoogleMap'
import { usePlacesAutocomplete } from '../composables/usePlacesAutocomplete'
import ZoneCard from '../components/ZoneCard.vue'
import RemoveFavoriteDialog from '../../../favorites/presentation/components/RemoveFavoriteDialog.vue'
import { useFavoriteToggle } from '../../../favorites/presentation/composables/useFavoriteToggle'
import StaleBadge from '../components/StaleBadge.vue'
import MapLegend from '../components/MapLegend.vue'
import ConnectivityNotice from '../components/ConnectivityNotice.vue'
import { useUserLocation } from '../composables/useUserLocation'
import { useNetworkStatus } from '../../../shared/presentation/composables/useNetworkStatus'
import { DEFAULT_RADIUS_KM, RADIUS_OPTIONS_KM, formatRadius, widerRadius } from '../../domain/geo'
import type { Zone, ZoneClassification } from '../../domain/model/zone.model'

const SEARCH_PAN_ZOOM = 15
const REFRESH_INTERVAL_MS = 30_000

const router = useRouter()
const zoneStore = useZoneStore()
const favoriteStore = useFavoriteStore()
const authStore = useAuthStore()

const userId = computed(() => authStore.user?.id ?? 0)

// HU-28: quitar pide confirmación; guardar es inmediato. Ambos con toast.
const favoriteToggle = useFavoriteToggle()
async function toggleFavorite(zone: Zone) {
  await favoriteToggle.toggle(zone.id, zone.name)
}

const mapRef = ref<HTMLElement | null>(null)
const mapPanelRef = ref<HTMLElement | null>(null)

const activeFilter = ref<ZoneClassification | 'TODOS'>('TODOS')
const selectedZone = ref<Zone | null>(null)
const popupZone = ref<Zone | null>(null)
const popupPos = ref({ x: 0, y: 0 })

const filters: { label: string; value: ZoneClassification | 'TODOS' }[] = [
  { label: 'Todos', value: 'TODOS' },
  { label: 'Libre', value: 'LIBRE' },
  { label: 'Moderado', value: 'MODERADO' },
  { label: 'Ocupado', value: 'OCUPADO' },
  { label: 'Sin datos', value: 'SIN_DATOS' },
]

// HU-06: avisos de conexión y de GPS, sin bloquear la pantalla.
const { online } = useNetworkStatus()
const { position, status: locationStatus, request: requestLocation } = useUserLocation({ watch: true })

// HU-07/HU-10: "Cerca de mí" y filtro de distancia. 'ALL' = sin filtro; el resto, km como texto.
const radius = ref<string>('ALL')
const radiusKm = computed(() => (radius.value === 'ALL' ? null : Number(radius.value)))
const radiusOptions: { label: string; value: string }[] = [
  { label: 'Cualquiera', value: 'ALL' },
  ...RADIUS_OPTIONS_KM.map(km => ({ label: formatRadius(km), value: String(km) })),
]
const nextRadius = computed(() => (radiusKm.value == null ? null : widerRadius(radiusKm.value)))
const needsLocation = computed(() => radiusKm.value != null && !position.value)
const locationBlocked = computed(() =>
  ['denied', 'unavailable', 'unsupported'].includes(locationStatus.value),
)

function nearMe() {
  radius.value = String(DEFAULT_RADIUS_KM)
}

/** Un solo tap: vuelve a mostrar todas las zonas (HU-10). */
function clearRadius() {
  radius.value = 'ALL'
}

function widenRadius() {
  if (nextRadius.value != null) radius.value = String(nextRadius.value)
}

// `search` lo provee el composable de Places y lo comparte el filtro de la lista.
const {
  search,
  suggestions,
  showSuggestions,
  init: initPlaces,
  onInput: onSearchInput,
  select: selectSuggestion,
  hide: hideSuggestions,
} = usePlacesAutocomplete({
  onSelect: (location) => map.panTo(location, SEARCH_PAN_ZOOM),
})

const distances = computed(() => (radiusKm.value == null ? null : zoneStore.nearbyDistances))

const filteredZones = computed(() => {
  const q = search.value.toLowerCase()
  const zones = (zoneStore.zones as Zone[]).filter((zone) => {
    const matchSearch =
      zone.name.toLowerCase().includes(q) ||
      zone.district.toLowerCase().includes(q)
    const matchFilter =
      activeFilter.value === 'TODOS' ||
      zone.classification === activeFilter.value
    return matchSearch && matchFilter
  })
  if (radiusKm.value == null) return zones
  // Con radio activo solo quedan las zonas dentro de él, de la más cercana a la más lejana.
  const d = distances.value
  if (!d) return []
  return zones
    .filter(zone => d.has(zone.id))
    .sort((a, b) => d.get(a.id)! - d.get(b.id)!)
})

const searchingNearby = computed(() =>
  radiusKm.value != null && !locationBlocked.value && (needsLocation.value || zoneStore.nearbyLoading),
)

// Un click/tap fija el resumen (hasta cerrarlo o tocar el mapa); el hover solo lo muestra.
const popupPinned = ref(false)

function openPopup(zone: Zone, event: MouseEvent) {
  if (!mapPanelRef.value) return
  const rect = mapPanelRef.value.getBoundingClientRect()
  popupPos.value = { x: event.clientX - rect.left, y: event.clientY - rect.top }
  popupZone.value = zone
  selectedZone.value = zone
}

function handleMarkerEnter(zone: Zone, event: MouseEvent) {
  if (popupPinned.value) return
  openPopup(zone, event)
}

function handleMarkerLeave() {
  if (!popupPinned.value) popupZone.value = null
}

function handleMarkerClick(zone: Zone, event: MouseEvent) {
  openPopup(zone, event)
  popupPinned.value = true
}

function closePopup() {
  popupPinned.value = false
  popupZone.value = null
}

const map = useGoogleMap({
  mapRef,
  zones: filteredZones,
  onMarkerEnter: handleMarkerEnter,
  onMarkerLeave: handleMarkerLeave,
  onMarkerClick: handleMarkerClick,
  onMapClick: closePopup,
})

// Al activar el radio sin ubicación se pide; con ubicación, se consulta al backend.
watch(radiusKm, (km) => {
  if (km == null) {
    zoneStore.clearNearby()
  } else if (!position.value) {
    if (locationStatus.value !== 'locating') requestLocation()
  } else {
    zoneStore.fetchNearby(position.value, km)
  }
  map.showUserArea(position.value, km, true)
})

// Al llegar o cambiar la ubicación con el filtro activo, se recalcula (sin "Cargando" si ya había).
watch(position, (pos, prev) => {
  if (pos && radiusKm.value != null) zoneStore.fetchNearby(pos, radiusKm.value, { silent: !!prev })
  map.showUserArea(pos, radiusKm.value, !prev && radiusKm.value != null)
})

const { mapError } = map

function focusZone(zone: Zone) {
  selectedZone.value = zone
  closePopup()
  map.focusZone(zone)
}

let refreshTimer: ReturnType<typeof setInterval>

onMounted(async () => {
  const tasks: Promise<unknown>[] = [zoneStore.fetchZones()]
  if (userId.value) tasks.push(favoriteStore.fetchFavorites(userId.value))
  await Promise.all(tasks)
  await map.init()
  await initPlaces()
  map.showUserArea(position.value, radiusKm.value)
  // HU-08/12: refresco cada 30 s en silencio (sin "Cargando"; la lista no parpadea).
  refreshTimer = setInterval(() => {
    zoneStore.fetchZones({ silent: true })
    if (position.value && radiusKm.value != null) {
      zoneStore.fetchNearby(position.value, radiusKm.value, { silent: true })
    }
  }, REFRESH_INTERVAL_MS)
})

onUnmounted(() => {
  clearInterval(refreshTimer)
  zoneStore.clearNearby()
})
</script>

<template>
  <div class="flex flex-col-reverse gap-5 lg:h-[calc(100vh-64px)] lg:flex-row">
    <div class="flex min-h-0 flex-col lg:w-[360px] lg:shrink-0">
      <div class="px-0.5 pb-3.5">
        <PageHeader title="Zonas" class="mb-3.5" />

        <div class="relative mb-2.5">
          <Search class="pointer-events-none absolute top-1/2 left-3 size-[15px] -translate-y-1/2 text-muted-foreground/70" aria-hidden="true" />
          <Input
            v-model="search"
            role="combobox"
            :aria-expanded="showSuggestions"
            aria-autocomplete="list"
            aria-label="Buscar zona, distrito o lugar"
            placeholder="Buscar zona, distrito o lugar..."
            autocomplete="off"
            class="h-[38px] border bg-card pl-9"
            @input="onSearchInput"
            @blur="hideSuggestions"
          />
          <ul
            v-if="showSuggestions"
            role="listbox"
            class="absolute inset-x-0 top-[calc(100%+4px)] z-50 divide-y divide-border/60 overflow-hidden rounded-[10px] border bg-popover shadow-[var(--pv-shadow-md)]"
          >
            <li
              v-for="(pred, i) in suggestions"
              :key="i"
              role="option"
              :aria-selected="false"
              class="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-accent"
              @mousedown.prevent="selectSuggestion(pred)"
            >
              <MapPin class="size-[13px] shrink-0 text-muted-foreground" aria-hidden="true" />
              <span class="flex min-w-0 flex-col gap-px">
                <span class="truncate text-[13px] font-semibold text-heading">{{ pred.mainText }}</span>
                <span class="truncate text-[11px] text-muted-foreground">{{ pred.secondaryText }}</span>
              </span>
            </li>
          </ul>
        </div>

        <FilterPills v-model="activeFilter" :options="filters" label="Filtrar por clasificación" size="sm" />

        <div class="mt-3 flex flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[11px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">Distancia</span>
            <Button
              v-if="radiusKm == null"
              variant="outline"
              size="sm"
              class="h-7 rounded-full px-3 text-xs"
              @click="nearMe"
            >
              <LocateFixed class="size-3.5" aria-hidden="true" /> Cerca de mí
            </Button>
            <Button
              v-else
              variant="ghost"
              size="sm"
              class="h-7 rounded-full px-2.5 text-xs text-link"
              @click="clearRadius"
            >
              <X class="size-3.5" aria-hidden="true" /> Limpiar filtro
            </Button>
          </div>
          <FilterPills v-model="radius" :options="radiusOptions" label="Filtrar por distancia" size="sm" />
        </div>

        <ConnectivityNotice
          :online="online"
          :location-status="locationStatus"
          class="mt-3"
          @retry-location="requestLocation"
        />
      </div>

      <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pt-1 pr-2 pb-5 pl-0.5 [scrollbar-width:thin]">
        <StateMessage v-if="zoneStore.zonesLoading">Cargando zonas...</StateMessage>
        <StateMessage v-else-if="zoneStore.zonesError" tone="error">{{ zoneStore.zonesError }}</StateMessage>
        <StateMessage v-else-if="searchingNearby">Buscando estacionamientos cercanos...</StateMessage>
        <StateMessage v-else-if="radiusKm != null && needsLocation" tone="empty" compact :icon="LocateFixed">
          Activa la ubicación (GPS) para ver los estacionamientos cercanos.
          <template #action>
            <div class="flex flex-wrap justify-center gap-2">
              <Button
                v-if="locationStatus === 'unavailable' || locationStatus === 'idle'"
                size="sm"
                variant="outline"
                @click="requestLocation"
              >
                Activar ubicación
              </Button>
              <Button size="sm" variant="ghost" @click="clearRadius">Limpiar filtro</Button>
            </div>
          </template>
        </StateMessage>
        <StateMessage v-else-if="filteredZones.length === 0 && radiusKm != null" tone="empty" compact>
          No hay estacionamientos a menos de {{ formatRadius(radiusKm) }} de tu ubicación.
          <template #action>
            <div class="flex flex-wrap justify-center gap-2">
              <Button v-if="nextRadius != null" size="sm" variant="outline" @click="widenRadius">
                Ampliar a {{ formatRadius(nextRadius) }}
              </Button>
              <Button size="sm" variant="ghost" @click="clearRadius">Limpiar filtro</Button>
            </div>
          </template>
        </StateMessage>
        <StateMessage v-else-if="filteredZones.length === 0" tone="empty" compact>No se encontraron zonas.</StateMessage>

        <ZoneCard
          v-for="zone in filteredZones"
          :key="zone.id"
          :zone="zone"
          :selected="selectedZone?.id === zone.id"
          :is-favorite="favoriteStore.isFavorite(zone.id)"
          :distance-meters="distances?.get(zone.id) ?? null"
          @focus="focusZone(zone)"
          @toggle-favorite="toggleFavorite(zone)"
          @view-detail="router.push(`/dashboard/zones/${zone.id}`)"
        />
      </div>
    </div>

    <div ref="mapPanelRef" class="relative flex h-[360px] flex-col lg:h-auto lg:flex-1">
      <div class="relative flex-1 overflow-hidden rounded-[14px] border">
        <div ref="mapRef" class="size-full" />
        <MapLegend v-if="!mapError" class="absolute bottom-3 left-3 z-[1] hidden sm:block" />
        <div v-if="mapError" class="absolute inset-0 flex items-center justify-center bg-muted p-6 text-center">
          <p class="max-w-xs text-sm font-medium text-destructive" role="alert">{{ mapError }}</p>
        </div>
      </div>

      <Transition
        enter-active-class="transition duration-150"
        leave-active-class="transition duration-150"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="popupZone"
          class="pointer-events-auto absolute z-10 min-w-[200px] -translate-x-1/2 -translate-y-[calc(100%+18px)] rounded-[10px] bg-popover px-3.5 py-3 text-popover-foreground shadow-[0_4px_20px_rgba(0,0,0,0.18)] after:absolute after:-bottom-[7px] after:left-1/2 after:-translate-x-1/2 after:border-x-8 after:border-t-8 after:border-x-transparent after:border-t-popover after:content-['']"
          :style="{ left: popupPos.x + 'px', top: popupPos.y + 'px' }"
        >
          <button
            v-if="popupPinned"
            type="button"
            class="absolute top-1.5 right-1.5 rounded p-1 text-muted-foreground hover:bg-accent"
            aria-label="Cerrar resumen"
            @click="closePopup"
          >
            <X class="size-3.5" aria-hidden="true" />
          </button>
          <p class="mb-[3px] pr-5 text-sm font-bold text-heading">{{ popupZone.name }}</p>
          <p class="mb-2 text-xs text-muted-foreground">{{ popupZone.street }}, {{ popupZone.district }}</p>
          <div class="flex flex-wrap items-center gap-1.5">
            <ClassificationBadge :classification="popupZone.classification" />
            <StaleBadge :freshness="popupZone" />
          </div>
          <SpaceCounts
            :free="popupZone.freeCount"
            :occupied="popupZone.occupiedCount"
            :total="popupZone.totalSpaces"
            class="mt-2"
          />
          <button
            v-if="popupPinned"
            type="button"
            class="mt-2.5 text-xs font-semibold text-link hover:underline"
            @click="router.push(`/dashboard/zones/${popupZone.id}`)"
          >
            Ver detalle
          </button>
        </div>
      </Transition>
    </div>
    <RemoveFavoriteDialog
      :open="favoriteToggle.confirmOpen.value"
      :zone-name="favoriteToggle.pending.value?.zoneName"
      :loading="favoriteToggle.removing.value"
      @confirm="favoriteToggle.confirmRemove"
      @cancel="favoriteToggle.cancelRemove"
    />
  </div>
</template>
