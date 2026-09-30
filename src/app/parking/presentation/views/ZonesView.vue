<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useZoneStore } from '../../application/zone.store'
import { useFavoriteStore } from '../../../favorites/application/favorite.store'
import { useAuthStore } from '../../../iam/application/auth.store'
import { MapPin, Search } from '@lucide/vue'
import { Input } from '@/app/shared/presentation/components/ui/input'
import FilterPills from '../../../shared/presentation/components/FilterPills.vue'
import PageHeader from '../../../shared/presentation/components/PageHeader.vue'
import StateMessage from '../../../shared/presentation/components/StateMessage.vue'
import ClassificationBadge from '../components/ClassificationBadge.vue'
import SpaceCounts from '../components/SpaceCounts.vue'
import { useGoogleMap } from '../composables/useGoogleMap'
import { usePlacesAutocomplete } from '../composables/usePlacesAutocomplete'
import ZoneCard from '../components/ZoneCard.vue'
import type { Zone, ZoneClassification } from '../../domain/model/zone.model'

const SEARCH_PAN_ZOOM = 15
const REFRESH_INTERVAL_MS = 30_000

const router = useRouter()
const zoneStore = useZoneStore()
const favoriteStore = useFavoriteStore()
const authStore = useAuthStore()

const userId = computed(() => authStore.user?.id ?? 0)

async function toggleFavorite(zone: Zone) {
  if (!userId.value) return
  if (favoriteStore.isFavorite(zone.id)) {
    await favoriteStore.removeFavorite(userId.value, zone.id)
  } else {
    await favoriteStore.addFavorite(userId.value, zone.id)
  }
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
]

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

const filteredZones = computed(() => {
  const q = search.value.toLowerCase()
  return (zoneStore.zones as Zone[]).filter((zone) => {
    const matchSearch =
      zone.name.toLowerCase().includes(q) ||
      zone.district.toLowerCase().includes(q)
    const matchFilter =
      activeFilter.value === 'TODOS' ||
      zone.classification === activeFilter.value
    return matchSearch && matchFilter
  })
})

function handleMarkerEnter(zone: Zone, event: MouseEvent) {
  if (!mapPanelRef.value) return
  const rect = mapPanelRef.value.getBoundingClientRect()
  popupPos.value = { x: event.clientX - rect.left, y: event.clientY - rect.top }
  popupZone.value = zone
  selectedZone.value = zone
}

function handleMarkerLeave() {
  popupZone.value = null
}

const map = useGoogleMap({
  mapRef,
  zones: filteredZones,
  onMarkerEnter: handleMarkerEnter,
  onMarkerLeave: handleMarkerLeave,
})

const { mapError } = map

function focusZone(zone: Zone) {
  selectedZone.value = zone
  popupZone.value = null
  map.focusZone(zone)
}

let refreshTimer: ReturnType<typeof setInterval>

onMounted(async () => {
  const tasks: Promise<unknown>[] = [zoneStore.fetchZones()]
  if (userId.value) tasks.push(favoriteStore.fetchFavorites(userId.value))
  await Promise.all(tasks)
  await map.init()
  await initPlaces()
  refreshTimer = setInterval(() => zoneStore.fetchZones(), REFRESH_INTERVAL_MS)
})

onUnmounted(() => clearInterval(refreshTimer))
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
      </div>

      <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pt-1 pr-2 pb-5 pl-0.5 [scrollbar-width:thin]">
        <StateMessage v-if="zoneStore.zonesLoading">Cargando zonas...</StateMessage>
        <StateMessage v-else-if="zoneStore.zonesError" tone="error">{{ zoneStore.zonesError }}</StateMessage>
        <StateMessage v-else-if="filteredZones.length === 0" tone="empty" compact>No se encontraron zonas.</StateMessage>

        <ZoneCard
          v-for="zone in filteredZones"
          :key="zone.id"
          :zone="zone"
          :selected="selectedZone?.id === zone.id"
          :is-favorite="favoriteStore.isFavorite(zone.id)"
          @focus="focusZone(zone)"
          @toggle-favorite="toggleFavorite(zone)"
          @view-detail="router.push(`/dashboard/zones/${zone.id}`)"
        />
      </div>
    </div>

    <div ref="mapPanelRef" class="relative flex h-[360px] flex-col lg:h-auto lg:flex-1">
      <div class="relative flex-1 overflow-hidden rounded-[14px] border">
        <div ref="mapRef" class="size-full" />
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
          <p class="mb-[3px] text-sm font-bold text-heading">{{ popupZone.name }}</p>
          <p class="mb-2 text-xs text-muted-foreground">{{ popupZone.street }}, {{ popupZone.district }}</p>
          <ClassificationBadge :classification="popupZone.classification" />
          <SpaceCounts
            :free="popupZone.freeCount"
            :occupied="popupZone.occupiedCount"
            :total="popupZone.totalSpaces"
            class="mt-2"
          />
        </div>
      </Transition>
    </div>
  </div>
</template>
