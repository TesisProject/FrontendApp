<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useZoneStore } from '../../application/zone.store'
import type { ZoneClassification } from '../../domain/model/zone.model'

const zoneStore = useZoneStore()

const search     = ref('')
const activeFilter = ref<ZoneClassification | 'TODOS'>('TODOS')

const filters: { label: string; value: ZoneClassification | 'TODOS' }[] = [
  { label: 'Todos',    value: 'TODOS'    },
  { label: 'Libre',    value: 'LIBRE'    },
  { label: 'Moderado', value: 'MODERADO' },
  { label: 'Ocupado',  value: 'OCUPADO'  },
]

const filteredZones = computed(() => {
  return (zoneStore.zones as any[]).filter(zone => {
    const matchesSearch = zone.name.toLowerCase().includes(search.value.toLowerCase()) ||
                          zone.district.toLowerCase().includes(search.value.toLowerCase())
    const matchesFilter = activeFilter.value === 'TODOS' || zone.classification === activeFilter.value
    return matchesSearch && matchesFilter
  })
})

function classificationColor(c: ZoneClassification) {
  return { LIBRE: '#38a169', MODERADO: '#f2894a', OCUPADO: '#e53e3e' }[c]
}

function classificationLabel(c: ZoneClassification) {
  return { LIBRE: 'Libre', MODERADO: 'Moderado', OCUPADO: 'Ocupado' }[c]
}

onMounted(() => zoneStore.fetchZones())
</script>

<template>
  <div class="zones-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Zonas de estacionamiento</h1>
        <p class="page-subtitle">Encuentra disponibilidad en tiempo real</p>
      </div>
      <div class="search-box">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input v-model="search" type="text" placeholder="Buscar por nombre o distrito..." class="search-input" />
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

    <div v-if="zoneStore.zonesLoading" class="state-box">
      <span class="loading-text">Cargando zonas...</span>
    </div>

    <div v-else-if="zoneStore.zonesError" class="state-box">
      <span class="error-text">{{ zoneStore.zonesError }}</span>
    </div>

    <div v-else-if="filteredZones.length === 0" class="state-box">
      <span class="empty-text">No se encontraron zonas.</span>
    </div>

    <div v-else class="zones-grid">
      <div v-for="zone in filteredZones" :key="zone.id" class="zone-card">
        <div class="card-top">
          <div class="card-info">
            <h2 class="zone-name">{{ zone.name }}</h2>
            <p class="zone-address">{{ zone.street }}, {{ zone.district }}</p>
            <p class="zone-city">{{ zone.city }}</p>
          </div>
          <span class="badge" :style="{ background: classificationColor(zone.classification) }">
            {{ classificationLabel(zone.classification) }}
          </span>
        </div>

        <div class="card-bottom">
          <div class="spaces-bar-wrap">
            <div class="spaces-bar">
              <div
                class="spaces-bar-fill"
                :style="{
                  width: zone.occupancyPercentage + '%',
                  background: classificationColor(zone.classification)
                }"
              />
            </div>
            <span class="spaces-pct">{{ Math.round(zone.occupancyPercentage) }}%</span>
          </div>
          <div class="spaces-stats">
            <span class="stat free">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {{ zone.freeCount }} libres
            </span>
            <span class="stat occupied">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              {{ zone.occupiedCount }} ocupados
            </span>
            <span class="stat total">/ {{ zone.totalSpaces }} totales</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.zones-page {
  max-width: 1100px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 16px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: #092c4c;
  margin: 0 0 4px;
}

.page-subtitle {
  font-size: 13px;
  color: #888;
  margin: 0;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 0 14px;
  height: 40px;
  min-width: 280px;
}

.search-input {
  border: none;
  outline: none;
  font-size: 14px;
  color: #333;
  background: transparent;
  width: 100%;
}

.search-input::placeholder {
  color: #aaa;
}

.filters {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.filter-chip {
  padding: 6px 16px;
  border-radius: 20px;
  border: 1px solid #e0e0e0;
  background: white;
  color: #555;
  font-size: 13px;
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

.state-box {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  background: white;
  border-radius: 12px;
}

.loading-text { color: #888; font-size: 14px; }
.error-text   { color: #e53e3e; font-size: 14px; }
.empty-text   { color: #aaa; font-size: 14px; }

.zones-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.zone-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: box-shadow 0.2s, transform 0.2s;
  cursor: pointer;
}

.zone-card:hover {
  box-shadow: 0px 4px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.zone-name {
  font-size: 16px;
  font-weight: 700;
  color: #092c4c;
  margin: 0 0 4px;
}

.zone-address {
  font-size: 13px;
  color: #555;
  margin: 0 0 2px;
}

.zone-city {
  font-size: 12px;
  color: #aaa;
  margin: 0;
}

.badge {
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.card-bottom {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.spaces-bar-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.spaces-bar {
  flex: 1;
  height: 6px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.spaces-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s;
}

.spaces-pct {
  font-size: 12px;
  font-weight: 600;
  color: #555;
  min-width: 32px;
  text-align: right;
}

.spaces-stats {
  display: flex;
  gap: 12px;
  align-items: center;
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.stat.free     { color: #38a169; }
.stat.occupied { color: #e53e3e; }
.stat.total    { color: #aaa; }
</style>
