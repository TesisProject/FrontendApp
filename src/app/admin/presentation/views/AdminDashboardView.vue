<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminZonesStore }   from '../../application/admin-zones.store'
import { useAdminCamerasStore } from '../../application/admin-cameras.store'
import { useAdminUsersStore }   from '../../application/admin-users.store'

const router       = useRouter()
const zonesStore   = useAdminZonesStore()
const camerasStore = useAdminCamerasStore()
const usersStore   = useAdminUsersStore()

const totalZones       = computed(() => zonesStore.zones.length)
const totalUsers       = computed(() => usersStore.users.length)
const totalCameras     = computed(() => camerasStore.cameras.length)
const activeCameras    = computed(() => camerasStore.cameras.filter(c => c.status === 'ACTIVE').length)
const globalOccupancy  = computed(() => {
  if (!zonesStore.zones.length) return 0
  const avg = zonesStore.zones.reduce((s, z) => s + z.occupancyPercentage, 0) / zonesStore.zones.length
  return Math.round(avg)
})
const zonesLibre    = computed(() => zonesStore.zones.filter(z => z.classification === 'LIBRE').length)
const zonesModerado = computed(() => zonesStore.zones.filter(z => z.classification === 'MODERADO').length)
const zonesOcupado  = computed(() => zonesStore.zones.filter(z => z.classification === 'OCUPADO').length)

const loading = computed(() => zonesStore.loading || camerasStore.loading || usersStore.loading)

onMounted(() => Promise.all([
  zonesStore.fetchZones(),
  camerasStore.fetchCameras(),
  usersStore.fetchUsers(),
]))
</script>

<template>
  <div class="admin-dash">
    <div class="page-header">
      <h1 class="page-title">Dashboard</h1>
      <p class="page-sub">Resumen general del sistema ParkVision</p>
    </div>

    <div v-if="loading" class="loading">Cargando métricas...</div>

    <template v-else>
      <div class="metrics-grid">
        <div class="metric-card" @click="router.push('/admin/zones')" style="cursor:pointer">
          <div class="metric-icon" style="background:#ebf8ff; color:#3182ce">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/>
              <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>
            </svg>
          </div>
          <div class="metric-info">
            <span class="metric-value">{{ totalZones }}</span>
            <span class="metric-label">Zonas registradas</span>
          </div>
        </div>

        <div class="metric-card" @click="router.push('/admin/users')" style="cursor:pointer">
          <div class="metric-icon" style="background:#f0fff4; color:#38a169">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div class="metric-info">
            <span class="metric-value">{{ totalUsers }}</span>
            <span class="metric-label">Usuarios registrados</span>
          </div>
        </div>

        <div class="metric-card" @click="router.push('/admin/cameras')" style="cursor:pointer">
          <div class="metric-icon" style="background:#fff5eb; color:#f2894a">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M23 7l-7 5 7 5V7z"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          </div>
          <div class="metric-info">
            <span class="metric-value">{{ activeCameras }}<span class="metric-total">/{{ totalCameras }}</span></span>
            <span class="metric-label">Cámaras activas</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon" style="background:#fff5f5; color:#e53e3e">
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
        <h2 class="section-title">Estado de zonas</h2>
        <div class="classif-grid">
          <div class="classif-card">
            <span class="classif-dot" style="background:#38a169" />
            <div>
              <p class="classif-count">{{ zonesLibre }}</p>
              <p class="classif-label">Libre (&lt;30%)</p>
            </div>
          </div>
          <div class="classif-card">
            <span class="classif-dot" style="background:#f2894a" />
            <div>
              <p class="classif-count">{{ zonesModerado }}</p>
              <p class="classif-label">Moderado (30-70%)</p>
            </div>
          </div>
          <div class="classif-card">
            <span class="classif-dot" style="background:#e53e3e" />
            <div>
              <p class="classif-count">{{ zonesOcupado }}</p>
              <p class="classif-label">Ocupado (&gt;70%)</p>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">Accesos rápidos</h2>
        <div class="shortcuts">
          <button class="shortcut-btn" @click="router.push('/admin/zones')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/>
            </svg>
            Gestionar zonas
          </button>
          <button class="shortcut-btn" @click="router.push('/admin/cameras')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
            Gestionar cámaras
          </button>
          <button class="shortcut-btn" @click="router.push('/admin/users')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            </svg>
            Gestionar usuarios
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.admin-dash { max-width: 900px; }

.page-header { margin-bottom: 28px; }
.page-title  { font-size: 22px; font-weight: 700; color: #092c4c; margin: 0 0 4px; }
.page-sub    { font-size: 13px; color: #888; margin: 0; }

.loading { font-size: 14px; color: #aaa; padding: 40px 0; }

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.metric-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  display: flex;
  align-items: center;
  gap: 14px;
  transition: box-shadow 0.2s;
}
.metric-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.1); }

.metric-icon {
  width: 48px; height: 48px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

.metric-info { display: flex; flex-direction: column; gap: 2px; }

.metric-value {
  font-size: 26px; font-weight: 700; color: #092c4c; line-height: 1;
}
.metric-total { font-size: 14px; color: #aaa; font-weight: 400; }
.metric-label { font-size: 12px; color: #888; }

.section { margin-bottom: 28px; }
.section-title { font-size: 15px; font-weight: 600; color: #092c4c; margin: 0 0 14px; }

.classif-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.classif-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  display: flex;
  align-items: center;
  gap: 14px;
}

.classif-dot {
  width: 14px; height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
}

.classif-count { font-size: 28px; font-weight: 700; color: #092c4c; margin: 0 0 2px; line-height: 1; }
.classif-label { font-size: 12px; color: #888; margin: 0; }

.shortcuts { display: flex; gap: 12px; flex-wrap: wrap; }

.shortcut-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 18px;
  background: white;
  border: 1.5px solid #e0e0e0;
  border-radius: 8px;
  font-size: 13px; font-weight: 500;
  color: #092c4c;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}
.shortcut-btn:hover { border-color: #092c4c; background: #f5f8fb; }
</style>
