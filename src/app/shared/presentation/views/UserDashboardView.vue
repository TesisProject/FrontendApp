<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAuthStore } from '../../../iam/application/auth.store'
import { useZoneStore } from '../../../parking/application/zone.store'

const authStore = useAuthStore()
const zoneStore = useZoneStore()

const totalZones    = computed(() => (zoneStore.zones as any[]).length)
const totalFree     = computed(() => (zoneStore.zones as any[]).reduce((sum, z) => sum + z.freeCount, 0))
const totalOccupied = computed(() => (zoneStore.zones as any[]).reduce((sum, z) => sum + z.occupiedCount, 0))
const zonesLibre    = computed(() => (zoneStore.zones as any[]).filter(z => z.classification === 'LIBRE').length)
const zonesModerado = computed(() => (zoneStore.zones as any[]).filter(z => z.classification === 'MODERADO').length)
const zonesOcupado  = computed(() => (zoneStore.zones as any[]).filter(z => z.classification === 'OCUPADO').length)

const globalOccupancy = computed(() => {
  const total = totalFree.value + totalOccupied.value
  if (total === 0) return 0
  return Math.round((totalOccupied.value / total) * 100)
})

onMounted(() => zoneStore.fetchZones())
</script>

<template>
  <div class="dashboard">
    <div class="welcome">
      <h1 class="welcome-title">Bienvenido, {{ authStore.user?.email?.split('@')[0] }}</h1>
      <p class="welcome-sub">Aquí tienes un resumen del estado actual de los estacionamientos</p>
    </div>

    <div v-if="zoneStore.zonesLoading" class="loading">Cargando métricas...</div>

    <template v-else>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-icon" style="background: #ebf8ff; color: #3182ce;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div class="metric-info">
            <span class="metric-value">{{ totalZones }}</span>
            <span class="metric-label">Zonas registradas</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon" style="background: #f0fff4; color: #38a169;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div class="metric-info">
            <span class="metric-value">{{ totalFree }}</span>
            <span class="metric-label">Espacios libres</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon" style="background: #fff5f5; color: #e53e3e;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <div class="metric-info">
            <span class="metric-value">{{ totalOccupied }}</span>
            <span class="metric-label">Espacios ocupados</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon" style="background: #fffbeb; color: #f2894a;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          </div>
          <div class="metric-info">
            <span class="metric-value">{{ globalOccupancy }}%</span>
            <span class="metric-label">Ocupación global</span>
          </div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">Estado por clasificación</h2>
        <div class="classification-grid">
          <div class="classif-card libre">
            <div class="classif-top">
              <span class="classif-dot" style="background: #38a169;"></span>
              <span class="classif-name">Libre</span>
            </div>
            <span class="classif-count">{{ zonesLibre }}</span>
            <span class="classif-sub">zonas disponibles</span>
          </div>

          <div class="classif-card moderado">
            <div class="classif-top">
              <span class="classif-dot" style="background: #f2894a;"></span>
              <span class="classif-name">Moderado</span>
            </div>
            <span class="classif-count">{{ zonesModerado }}</span>
            <span class="classif-sub">zonas con espacio</span>
          </div>

          <div class="classif-card ocupado">
            <div class="classif-top">
              <span class="classif-dot" style="background: #e53e3e;"></span>
              <span class="classif-name">Ocupado</span>
            </div>
            <span class="classif-count">{{ zonesOcupado }}</span>
            <span class="classif-sub">zonas llenas</span>
          </div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">Ocupación global</h2>
        <div class="global-bar-card">
          <div class="global-bar-wrap">
            <div class="global-bar">
              <div class="global-bar-fill" :style="{ width: globalOccupancy + '%' }" />
            </div>
            <span class="global-pct">{{ globalOccupancy }}%</span>
          </div>
          <div class="global-legend">
            <span class="legend-item">
              <span class="legend-dot" style="background: #e53e3e;"></span>
              {{ totalOccupied }} ocupados
            </span>
            <span class="legend-item">
              <span class="legend-dot" style="background: #38a169;"></span>
              {{ totalFree }} libres
            </span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dashboard { max-width: 900px; }

.welcome { margin-bottom: 28px; }

.welcome-title {
  font-size: 22px;
  font-weight: 700;
  color: #092c4c;
  margin: 0 0 6px;
  text-transform: capitalize;
}

.welcome-sub {
  font-size: 13px;
  color: #888;
  margin: 0;
}

.loading {
  color: #888;
  font-size: 14px;
  padding: 40px 0;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.metric-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0px 2px 8px rgba(0,0,0,0.06);
  display: flex;
  align-items: center;
  gap: 16px;
}

.metric-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.metric-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.metric-value {
  font-size: 26px;
  font-weight: 700;
  color: #092c4c;
  line-height: 1;
}

.metric-label {
  font-size: 12px;
  color: #888;
}

.section { margin-bottom: 28px; }

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #092c4c;
  margin: 0 0 14px;
}

.classification-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.classif-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0px 2px 8px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.classif-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.classif-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.classif-name {
  font-size: 13px;
  font-weight: 600;
  color: #555;
}

.classif-count {
  font-size: 32px;
  font-weight: 700;
  color: #092c4c;
  line-height: 1;
}

.classif-sub {
  font-size: 12px;
  color: #aaa;
}

.global-bar-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0px 2px 8px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.global-bar-wrap {
  display: flex;
  align-items: center;
  gap: 14px;
}

.global-bar {
  flex: 1;
  height: 12px;
  background: #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
}

.global-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #f2894a, #e53e3e);
  border-radius: 8px;
  transition: width 0.5s;
}

.global-pct {
  font-size: 16px;
  font-weight: 700;
  color: #092c4c;
  min-width: 40px;
}

.global-legend {
  display: flex;
  gap: 20px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #555;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
</style>
