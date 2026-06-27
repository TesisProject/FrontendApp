<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useZoneStore } from '../../application/zone.store'
import { useFavoriteStore } from '../../../favorites/application/favorite.store'
import { useAuthStore } from '../../../iam/application/auth.store'
import {
  classificationColor,
  classificationLabel,
} from '../../domain/zone-classification'
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
  <div class="zones-page">
    <div class="left-panel">
      <div class="panel-header">
        <h1 class="page-title">Zonas</h1>
        <div class="search-box">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#aaa"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            v-model="search"
            type="text"
            placeholder="Buscar zona, distrito o lugar..."
            class="search-input"
            autocomplete="off"
            @input="onSearchInput"
            @blur="hideSuggestions"
          />
          <div v-if="showSuggestions" class="suggestions-dropdown">
            <button
              v-for="(pred, i) in suggestions"
              :key="i"
              class="suggestion-item"
              @mousedown.prevent="selectSuggestion(pred)"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="suggestion-icon"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <div class="suggestion-texts">
                <span class="suggestion-main">{{ pred.mainText }}</span>
                <span class="suggestion-secondary">{{
                  pred.secondaryText
                }}</span>
              </div>
            </button>
          </div>
        </div>

        <div class="filters">
          <button
            v-for="f in filters"
            :key="f.value"
            class="filter-chip"
            :class="{ active: activeFilter === f.value }"
            @click="activeFilter = f.value"
          >
            {{ f.label }}
          </button>
        </div>
      </div>

      <div class="zone-list">
        <div v-if="zoneStore.zonesLoading" class="state-box">
          <span class="state-text">Cargando zonas...</span>
        </div>
        <div v-else-if="zoneStore.zonesError" class="state-box">
          <span class="state-text error">{{ zoneStore.zonesError }}</span>
        </div>
        <div v-else-if="filteredZones.length === 0" class="state-box">
          <span class="state-text">No se encontraron zonas.</span>
        </div>

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

    <div ref="mapPanelRef" class="map-panel">
      <div class="map-card">
        <div ref="mapRef" class="map" />
        <div v-if="mapError" class="map-error">
          <p class="map-error-text">{{ mapError }}</p>
        </div>
      </div>

      <Transition name="popup">
        <div
          v-if="popupZone"
          class="map-popup"
          :style="{ left: popupPos.x + 'px', top: popupPos.y + 'px' }"
        >
          <p class="popup-name">{{ popupZone.name }}</p>
          <p class="popup-address">
            {{ popupZone.street }}, {{ popupZone.district }}
          </p>
          <span
            class="popup-badge"
            :style="{
              background: classificationColor(popupZone.classification),
            }"
          >
            {{ classificationLabel(popupZone.classification) }}
          </span>
          <div class="popup-stats">
            <span class="stat-free">{{ popupZone.freeCount }} libres</span>
            <span class="sep">·</span>
            <span class="stat-occ">{{ popupZone.occupiedCount }} ocupados</span>
            <span class="sep">·</span>
            <span class="stat-total">{{ popupZone.totalSpaces }} total</span>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.zones-page {
  display: flex;
  gap: 20px;
  height: calc(100vh - 96px);
}

.left-panel {
  width: 360px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.panel-header {
  padding: 0 2px 14px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: #092c4c;
  margin: 0 0 14px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 0 12px;
  height: 38px;
  margin-bottom: 10px;
}

.search-input {
  border: none;
  outline: none;
  font-size: 13px;
  color: #333;
  background: transparent;
  width: 100%;
}

.search-input::placeholder {
  color: #bbb;
}

.filters {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.filter-chip {
  padding: 4px 12px;
  border-radius: 16px;
  border: 1px solid #e0e0e0;
  background: white;
  color: #666;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-chip:hover {
  border-color: #092c4c;
  color: #092c4c;
}
.filter-chip.active {
  background: #092c4c;
  border-color: #092c4c;
  color: white;
}

.zone-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 8px 20px 2px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: transparent;
}

.zone-list::-webkit-scrollbar {
  width: 4px;
}
.zone-list::-webkit-scrollbar-track {
  background: transparent;
}
.zone-list::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 4px;
}

.state-box {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}

.state-text {
  font-size: 13px;
  color: #aaa;
}
.state-text.error {
  color: #e53e3e;
}

.map-panel {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
}

.map-card {
  flex: 1;
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.map {
  width: 100%;
  height: 100%;
}

.map-error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #f7f9fb;
  text-align: center;
}

.map-error-text {
  margin: 0;
  max-width: 320px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-error);
}

.map-popup {
  position: absolute;
  transform: translate(-50%, calc(-100% - 18px));
  background: white;
  border-radius: 10px;
  padding: 12px 14px;
  min-width: 200px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.18);
  z-index: 10;
  pointer-events: all;
}

.map-popup::after {
  content: '';
  position: absolute;
  bottom: -7px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid white;
}

.popup-name {
  margin: 0 0 3px;
  font-weight: 700;
  font-size: 14px;
  color: #092c4c;
}

.popup-address {
  margin: 0 0 8px;
  font-size: 12px;
  color: #888;
}

.popup-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.popup-stats {
  display: flex;
  gap: 5px;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
}

.stat-free {
  color: #38a169;
  font-weight: 600;
}
.stat-occ {
  color: #e53e3e;
  font-weight: 600;
}
.stat-total {
  color: #aaa;
}
.sep {
  color: #ddd;
}

.popup-enter-active,
.popup-leave-active {
  transition:
    opacity 0.15s,
    transform 0.15s;
}
.popup-enter-from,
.popup-leave-to {
  opacity: 0;
  transform: translate(-50%, calc(-100% - 10px));
}

/* Places suggestions dropdown */
.search-box {
  position: relative;
}

.suggestions-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  z-index: 100;
  overflow: hidden;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: background 0.15s;
  border-bottom: 1px solid #f5f5f5;
}

.suggestion-item:last-child {
  border-bottom: none;
}
.suggestion-item:hover {
  background: #f8f8f8;
}

.suggestion-icon {
  color: #aaa;
  flex-shrink: 0;
}

.suggestion-texts {
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow: hidden;
}

.suggestion-main {
  font-size: 13px;
  font-weight: 600;
  color: #092c4c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suggestion-secondary {
  font-size: 11px;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
