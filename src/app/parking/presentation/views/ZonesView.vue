<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { useZoneStore } from '../../application/zone.store'
import { env } from '../../../../environments/env'
import type { Zone, ZoneClassification } from '../../domain/model/zone.model'

// Singleton: setOptions solo se puede llamar una vez por sesión de navegador
let mapsConfigured = false

const zoneStore      = useZoneStore()
const mapRef         = ref<HTMLElement | null>(null)
const mapPanelRef    = ref<HTMLElement | null>(null)
const search         = ref('')
const activeFilter   = ref<ZoneClassification | 'TODOS'>('TODOS')
const selectedZone   = ref<Zone | null>(null)
const popupZone      = ref<Zone | null>(null)
const popupPos       = ref({ x: 0, y: 0 })

let map: google.maps.Map | null = null
let markerData: { marker: google.maps.marker.AdvancedMarkerElement }[] = []

const filters: { label: string; value: ZoneClassification | 'TODOS' }[] = [
  { label: 'Todos',    value: 'TODOS'    },
  { label: 'Libre',    value: 'LIBRE'    },
  { label: 'Moderado', value: 'MODERADO' },
  { label: 'Ocupado',  value: 'OCUPADO'  },
]

const filteredZones = computed(() =>
  (zoneStore.zones as Zone[]).filter(zone => {
    const matchSearch = zone.name.toLowerCase().includes(search.value.toLowerCase()) ||
                        zone.district.toLowerCase().includes(search.value.toLowerCase())
    const matchFilter = activeFilter.value === 'TODOS' || zone.classification === activeFilter.value
    return matchSearch && matchFilter
  })
)

function classificationColor(c: ZoneClassification) {
  return { LIBRE: '#38a169', MODERADO: '#f2894a', OCUPADO: '#e53e3e' }[c]
}

function classificationLabel(c: ZoneClassification) {
  return { LIBRE: 'Libre', MODERADO: 'Moderado', OCUPADO: 'Ocupado' }[c]
}

function addMarkers() {
  markerData.forEach(({ marker }) => { marker.map = null })
  markerData = []
  if (!map) return

  filteredZones.value.forEach(zone => {
    const pin = document.createElement('div')
    pin.style.cssText = `
      width: 22px; height: 22px; border-radius: 50%;
      background: ${classificationColor(zone.classification)};
      border: 2.5px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      cursor: pointer;
    `

    const marker = new google.maps.marker.AdvancedMarkerElement({
      position: { lat: zone.latitude, lng: zone.longitude },
      map,
      title: zone.name,
      content: pin,
    })

    pin.addEventListener('mouseenter', (e: MouseEvent) => {
      const rect = mapPanelRef.value!.getBoundingClientRect()
      popupPos.value = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      popupZone.value = zone
      selectedZone.value = zone
    })

    pin.addEventListener('mouseleave', () => {
      popupZone.value = null
    })

    markerData.push({ marker })
  })
}

function focusZone(zone: Zone) {
  selectedZone.value = zone
  popupZone.value = null
  if (!map) return
  map.panTo({ lat: zone.latitude, lng: zone.longitude })
  map.setZoom(16)
}

async function initMap() {
  if (!mapsConfigured) {
    setOptions({ key: env.googleMapsKey, version: 'weekly' })
    mapsConfigured = true
  }
  await importLibrary('maps')
  await importLibrary('marker')

  map = new google.maps.Map(mapRef.value!, {
    center: { lat: -12.0464, lng: -77.0428 },
    zoom: 12,
    mapId: 'DEMO_MAP_ID',
    mapTypeControl: false,
    fullscreenControl: false,
    streetViewControl: false,
    zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
  })

  addMarkers()
}

watch(filteredZones, () => addMarkers())

onMounted(async () => {
  await zoneStore.fetchZones()
  await initMap()
})
</script>

<template>
  <div class="zones-page">
    <div class="left-panel">
      <div class="panel-header">
        <h1 class="page-title">Zonas</h1>
        <div class="search-box">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input v-model="search" type="text" placeholder="Buscar zona o distrito..." class="search-input" />
        </div>

        <div class="filters">
          <button
            v-for="f in filters" :key="f.value"
            class="filter-chip" :class="{ active: activeFilter === f.value }"
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

        <div
          v-for="zone in filteredZones" :key="zone.id"
          class="zone-card" :class="{ selected: selectedZone?.id === zone.id }"
          @click="focusZone(zone)"
        >
          <div class="card-top">
            <div class="card-info">
              <p class="zone-name">{{ zone.name }}</p>
              <p class="zone-address">{{ zone.street }}, {{ zone.district }}</p>
            </div>
            <span class="badge" :style="{ background: classificationColor(zone.classification) }">
              {{ classificationLabel(zone.classification) }}
            </span>
          </div>

          <div class="card-bottom">
            <div class="bar-wrap">
              <div class="bar">
                <div class="bar-fill" :style="{ width: zone.occupancyPercentage + '%', background: classificationColor(zone.classification) }" />
              </div>
              <span class="bar-pct">{{ Math.round(zone.occupancyPercentage) }}%</span>
            </div>
            <div class="spaces-row">
              <span class="space-stat free">{{ zone.freeCount }} libres</span>
              <span class="space-stat occupied">{{ zone.occupiedCount }} ocupados</span>
              <span class="space-stat total">/ {{ zone.totalSpaces }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div ref="mapPanelRef" class="map-panel">
      <div class="map-card">
        <div ref="mapRef" class="map" />
      </div>

      <Transition name="popup">
        <div
          v-if="popupZone"
          class="map-popup"
          :style="{ left: popupPos.x + 'px', top: popupPos.y + 'px' }"
        >
          <p class="popup-name">{{ popupZone.name }}</p>
          <p class="popup-address">{{ popupZone.street }}, {{ popupZone.district }}</p>
          <span class="popup-badge" :style="{ background: classificationColor(popupZone.classification) }">
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
  background: white;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid #e8e8e8;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.panel-header {
  padding: 20px 16px 12px;
  background: white;
  border-bottom: 1px solid #f0f0f0;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: #092c4c;
  margin: 0 0 12px;
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

.search-input::placeholder { color: #bbb; }

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

.filter-chip:hover  { border-color: #092c4c; color: #092c4c; }
.filter-chip.active { background: #092c4c; border-color: #092c4c; color: white; }

.zone-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 12px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #fafafa;
}

.zone-list::-webkit-scrollbar { width: 4px; }
.zone-list::-webkit-scrollbar-track { background: transparent; }
.zone-list::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }

.state-box {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}

.state-text       { font-size: 13px; color: #aaa; }
.state-text.error { color: #e53e3e; }

.zone-card {
  background: white;
  border-radius: 10px;
  padding: 14px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.2s, box-shadow 0.2s;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.zone-card:hover   { box-shadow: 0 3px 10px rgba(0,0,0,0.1); }
.zone-card.selected { border-color: #f2894a; }

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.zone-name {
  font-size: 14px;
  font-weight: 700;
  color: #092c4c;
  margin: 0 0 3px;
}

.zone-address {
  font-size: 12px;
  color: #888;
  margin: 0;
}

.badge {
  flex-shrink: 0;
  padding: 3px 9px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 700;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.bar-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bar {
  flex: 1;
  height: 5px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s;
}

.bar-pct {
  font-size: 11px;
  font-weight: 600;
  color: #666;
  min-width: 28px;
  text-align: right;
}

.spaces-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.space-stat { font-size: 11px; }
.space-stat.free     { color: #38a169; font-weight: 600; }
.space-stat.occupied { color: #e53e3e; font-weight: 600; }
.space-stat.total    { color: #bbb; }

.map-panel {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
}

.map-card {
  flex: 1;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 16px rgba(0,0,0,0.10);
  border: 1px solid #e8e8e8;
}

.map {
  width: 100%;
  height: 100%;
}

.map-popup {
  position: absolute;
  transform: translate(-50%, calc(-100% - 18px));
  background: white;
  border-radius: 10px;
  padding: 12px 14px;
  min-width: 200px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.18);
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

.stat-free  { color: #38a169; font-weight: 600; }
.stat-occ   { color: #e53e3e; font-weight: 600; }
.stat-total { color: #aaa; }
.sep        { color: #ddd; }

.popup-enter-active, .popup-leave-active { transition: opacity 0.15s, transform 0.15s; }
.popup-enter-from, .popup-leave-to {
  opacity: 0;
  transform: translate(-50%, calc(-100% - 10px));
}
</style>
