<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useZoneStore } from '../../application/zone.store'
import { useCameraStore } from '../../../vision/application/camera.store'
import type { ZoneClassification } from '../../domain/model/zone.model'
import type { CameraStatus } from '../../../vision/domain/model/camera.model'

const router      = useRouter()
const route       = useRoute()
const zoneStore   = useZoneStore()
const cameraStore = useCameraStore()

const zoneId = computed(() => Number(route.params.id))

const classificationColor = (c: ZoneClassification) =>
  ({ LIBRE: '#38a169', MODERADO: '#f2894a', OCUPADO: '#e53e3e' }[c])

const classificationLabel = (c: ZoneClassification) =>
  ({ LIBRE: 'Libre', MODERADO: 'Moderado', OCUPADO: 'Ocupado' }[c])

const cameraStatusColor = (s: CameraStatus) =>
  ({ ACTIVE: '#38a169', INACTIVE: '#aaa', ERROR: '#e53e3e' }[s])

const cameraStatusLabel = (s: CameraStatus) =>
  ({ ACTIVE: 'Activa', INACTIVE: 'Inactiva', ERROR: 'Error' }[s])

const occupancyPct = computed(() =>
  zoneStore.zone ? Math.round(zoneStore.zone.occupancyPercentage) : 0
)

onMounted(async () => {
  await Promise.all([
    zoneStore.fetchZone(zoneId.value),
    zoneStore.fetchSpacesByZone(zoneId.value),
    cameraStore.fetchByZone(zoneId.value),
  ])
})
</script>

<template>
  <div class="detail-page">

    <!-- Header -->
    <div class="page-header">
      <button class="back-btn" @click="router.push('/dashboard/zones')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Zonas
      </button>
    </div>

    <!-- Loading / Error -->
    <div v-if="zoneStore.zoneLoading" class="center-state">
      <span class="state-text">Cargando zona...</span>
    </div>
    <div v-else-if="zoneStore.zoneError" class="center-state">
      <span class="state-text error">{{ zoneStore.zoneError }}</span>
    </div>

    <template v-else-if="zoneStore.zone">
      <!-- Zone title row -->
      <div class="zone-title-row">
        <div>
          <h1 class="zone-name">{{ zoneStore.zone.name }}</h1>
          <p class="zone-address">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            {{ zoneStore.zone.street }}, {{ zoneStore.zone.district }} · {{ zoneStore.zone.city }}
          </p>
        </div>
        <span
          class="classification-badge"
          :style="{ background: classificationColor(zoneStore.zone.classification) }"
        >
          {{ classificationLabel(zoneStore.zone.classification) }}
        </span>
      </div>

      <!-- Stats row -->
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-value">{{ zoneStore.zone.totalSpaces }}</span>
          <span class="stat-label">Total</span>
        </div>
        <div class="stat-card">
          <span class="stat-value libre">{{ zoneStore.zone.freeCount }}</span>
          <span class="stat-label">Libres</span>
        </div>
        <div class="stat-card">
          <span class="stat-value ocupado">{{ zoneStore.zone.occupiedCount }}</span>
          <span class="stat-label">Ocupados</span>
        </div>
        <div class="stat-card">
          <div class="pct-wrap">
            <span class="stat-value">{{ occupancyPct }}%</span>
            <div class="pct-bar">
              <div
                class="pct-fill"
                :style="{ width: occupancyPct + '%', background: classificationColor(zoneStore.zone.classification) }"
              />
            </div>
          </div>
          <span class="stat-label">Ocupación</span>
        </div>
      </div>

      <!-- Main content -->
      <div class="main-grid">

        <!-- Spaces -->
        <div class="section-card spaces-section">
          <h2 class="section-title">Espacios</h2>

          <div v-if="zoneStore.spacesLoading" class="section-state">Cargando espacios...</div>
          <div v-else-if="zoneStore.spacesError" class="section-state error">{{ zoneStore.spacesError }}</div>
          <div v-else-if="(zoneStore.spaces as any[]).length === 0" class="section-state">Sin espacios registrados.</div>
          <div v-else class="spaces-grid">
            <div
              v-for="space in (zoneStore.spaces as any[])"
              :key="space.id"
              class="space-box"
              :class="space.occupied ? 'space-occupied' : 'space-libre'"
              :title="space.spaceNumber + (space.occupied ? ' · Ocupado' : ' · Libre')"
            >
              <span class="space-num">{{ space.spaceNumber }}</span>
            </div>
          </div>

          <!-- Legend -->
          <div class="legend" v-if="!(zoneStore.spacesLoading) && (zoneStore.spaces as any[]).length > 0">
            <span class="legend-item">
              <span class="legend-dot libre-dot" /> Libre
            </span>
            <span class="legend-item">
              <span class="legend-dot ocupado-dot" /> Ocupado
            </span>
          </div>
        </div>

        <!-- Cameras -->
        <div class="section-card cameras-section">
          <h2 class="section-title">Cámaras</h2>

          <div v-if="cameraStore.camerasLoading" class="section-state">Cargando cámaras...</div>
          <div v-else-if="cameraStore.camerasError" class="section-state error">{{ cameraStore.camerasError }}</div>
          <div v-else-if="(cameraStore.cameras as any[]).length === 0" class="section-state">Sin cámaras registradas.</div>
          <div v-else class="camera-list">
            <div
              v-for="camera in (cameraStore.cameras as any[])"
              :key="camera.id"
              class="camera-row"
            >
              <div class="camera-icon-wrap">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#092c4c" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
              </div>
              <div class="camera-info">
                <p class="camera-ip">{{ camera.ipAddress }}</p>
                <p class="camera-id">ID: {{ camera.id.slice(0, 8) }}...</p>
              </div>
              <span
                class="camera-status"
                :style="{ background: cameraStatusColor(camera.status) + '22', color: cameraStatusColor(camera.status) }"
              >
                <span class="status-dot" :style="{ background: cameraStatusColor(camera.status) }" />
                {{ cameraStatusLabel(camera.status) }}
              </span>
            </div>
          </div>
        </div>

      </div>
    </template>

  </div>
</template>

<style scoped>
.detail-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Header */
.page-header {
  display: flex;
  align-items: center;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  cursor: pointer;
  color: #092c4c;
  font-size: 14px;
  font-weight: 500;
  padding: 6px 10px;
  border-radius: 8px;
  transition: background 0.2s;
}
.back-btn:hover { background: #f0f4f8; }

/* Title row */
.zone-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.zone-name {
  font-size: 24px;
  font-weight: 700;
  color: #092c4c;
  margin: 0 0 6px;
}

.zone-address {
  font-size: 13px;
  color: #888;
  margin: 0;
  display: flex;
  align-items: center;
}

.classification-badge {
  flex-shrink: 0;
  padding: 5px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-top: 4px;
}

/* Stats */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e8e8e8;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: #092c4c;
  line-height: 1;
}
.stat-value.libre   { color: #38a169; }
.stat-value.ocupado { color: #e53e3e; }

.stat-label {
  font-size: 12px;
  color: #888;
  font-weight: 500;
}

.pct-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pct-bar {
  height: 4px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  width: 100%;
}

.pct-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

/* Main grid */
.main-grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 16px;
  align-items: start;
}

.section-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e8e8e8;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  color: #092c4c;
  margin: 0 0 16px;
}

.section-state {
  font-size: 13px;
  color: #aaa;
  padding: 20px 0;
  text-align: center;
}
.section-state.error { color: #e53e3e; }

/* Spaces grid */
.spaces-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(54px, 1fr));
  gap: 8px;
}

.space-box {
  aspect-ratio: 1;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  transition: transform 0.15s;
}
.space-box:hover { transform: scale(1.06); }

.space-libre {
  background: #e6f7ee;
  border: 1.5px solid #38a169;
}
.space-occupied {
  background: #fde8e8;
  border: 1.5px solid #e53e3e;
}

.space-num {
  font-size: 11px;
  font-weight: 700;
  color: #092c4c;
}

.legend {
  display: flex;
  gap: 16px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #f0f0f0;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #666;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}
.libre-dot   { background: #38a169; }
.ocupado-dot { background: #e53e3e; }

/* Cameras */
.camera-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.camera-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  background: #fafafa;
}

.camera-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #eef2f7;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.camera-info {
  flex: 1;
  min-width: 0;
}

.camera-ip {
  font-size: 13px;
  font-weight: 600;
  color: #092c4c;
  margin: 0 0 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.camera-id {
  font-size: 11px;
  color: #aaa;
  margin: 0;
}

.camera-status {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

/* State helpers */
.center-state {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}
.state-text       { font-size: 14px; color: #aaa; }
.state-text.error { color: #e53e3e; }
</style>
