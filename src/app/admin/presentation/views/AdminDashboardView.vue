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
const activeCameras    = computed(() => camerasStore.cameras.filter(c => c.active).length)
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

    <div v-if="loading" class="metrics-grid" aria-hidden="true">
      <div v-for="i in 4" :key="i" class="metric-card skeleton-card">
        <div class="skeleton skeleton-icon" />
        <div class="metric-info">
          <span class="skeleton skeleton-value" />
          <span class="skeleton skeleton-label" />
        </div>
      </div>
    </div>

    <template v-else>
      <div class="metrics-grid">
        <button type="button" class="metric-card clickable" @click="router.push('/admin/zones')">
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
        </button>

        <button type="button" class="metric-card clickable" @click="router.push('/admin/users')">
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
        </button>

        <button type="button" class="metric-card clickable" @click="router.push('/admin/cameras')">
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
        </button>

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
.admin-dash { max-width: 900px; margin: 0 auto; }

.page-header { margin-bottom: 28px; }
.page-title {
  font-family: 'Barlow Condensed', 'Inter', sans-serif;
  font-size: 30px;
  font-weight: 600;
  line-height: 1.05;
  color: #092c4c;
  margin: 0 0 4px;
  letter-spacing: 0.3px;
}
.page-title::after {
  content: '';
  display: block;
  width: 38px;
  height: 7px;
  margin-top: 7px;
  border-radius: 1px;
  background: repeating-linear-gradient(115deg, #f2894a 0 9px, transparent 9px 15px);
}
.page-sub { font-size: 13px; color: #5b6b7b; margin: 0; }

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.metric-card {
  background: white;
  border: 1px solid #e5e9ee;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(9, 44, 76, 0.08);
  display: flex;
  align-items: center;
  gap: 14px;
  text-align: left;
  font-family: inherit;
  transition: box-shadow 0.2s ease-out, transform 0.2s ease-out, border-color 0.2s ease-out;
}

.metric-card.clickable { cursor: pointer; }
.metric-card.clickable:hover {
  box-shadow: 0 6px 18px rgba(9, 44, 76, 0.12);
  transform: translateY(-2px);
  border-color: #c3d4f5;
}
.metric-card.clickable:active { transform: translateY(0) scale(0.99); }
.metric-card.clickable:focus-visible {
  outline: 2px solid #092c4c;
  outline-offset: 2px;
}

/* Skeleton de carga */
.skeleton {
  display: block;
  border-radius: 6px;
  background: linear-gradient(90deg, #eef1f4 25%, #f7f9fb 50%, #eef1f4 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
.skeleton-icon  { width: 48px; height: 48px; border-radius: 12px; flex-shrink: 0; }
.skeleton-value { width: 56px; height: 24px; margin-bottom: 6px; }
.skeleton-label { width: 110px; height: 12px; }

@keyframes shimmer {
  from { background-position: 200% 0; }
  to   { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; }
  .metric-card { transition: none; }
}

.metric-icon {
  width: 48px; height: 48px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

.metric-info { display: flex; flex-direction: column; gap: 2px; }

.metric-value {
  font-family: 'Barlow Condensed', 'Inter', sans-serif;
  font-size: 34px; font-weight: 600; color: #092c4c; line-height: 1;
}
.metric-total { font-size: 16px; color: #8a94a0; font-weight: 500; }
.metric-label { font-size: 12px; color: #5b6b7b; }

.section { margin-bottom: 28px; }
.section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: #5b6b7b;
  margin: 0 0 14px;
}

.classif-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.classif-card {
  background: white;
  border: 1px solid #e5e9ee;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(9, 44, 76, 0.08);
  display: flex;
  align-items: center;
  gap: 14px;
}

.classif-dot {
  width: 14px; height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
}

.classif-count {
  font-family: 'Barlow Condensed', 'Inter', sans-serif;
  font-size: 34px; font-weight: 600; color: #092c4c; margin: 0 0 2px; line-height: 1;
}
.classif-label { font-size: 12px; color: #5b6b7b; margin: 0; }

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
.shortcut-btn:focus-visible { outline: 2px solid #092c4c; outline-offset: 2px; }
.shortcut-btn:active { transform: scale(0.97); }
</style>
