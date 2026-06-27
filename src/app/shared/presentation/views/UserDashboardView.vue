<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../../iam/application/auth.store'
import { useZoneStore } from '../../../parking/application/zone.store'
import { useNotificationStore } from '../../../notifications/application/notification.store'
import type { Zone, ZoneClassification } from '../../../parking/domain/model/zone.model'
import type { NotificationType } from '../../../notifications/domain/model/notification.model'

const router        = useRouter()
const authStore     = useAuthStore()
const zoneStore     = useZoneStore()
const notifStore    = useNotificationStore()

const userId = computed(() => authStore.user?.id ?? 0)

const zones = computed(() => zoneStore.zones as Zone[])

const totalZones    = computed(() => zones.value.length)
const totalFree     = computed(() => zones.value.reduce((sum, z) => sum + z.freeCount, 0))
const totalOccupied = computed(() => zones.value.reduce((sum, z) => sum + z.occupiedCount, 0))
const zonesLibre    = computed(() => zones.value.filter(z => z.classification === 'LIBRE').length)
const zonesModerado = computed(() => zones.value.filter(z => z.classification === 'MODERADO').length)
const zonesOcupado  = computed(() => zones.value.filter(z => z.classification === 'OCUPADO').length)

const globalOccupancy = computed(() => {
  const total = totalFree.value + totalOccupied.value
  if (total === 0) return 0
  return Math.round((totalOccupied.value / total) * 100)
})

// zones sorted with most available first — surfaces where the user can park now
const sortedZones = computed(() =>
  [...zones.value].sort((a, b) => a.occupancyPercentage - b.occupancyPercentage),
)

const recentNotifications = computed(() => notifStore.notifications.slice(0, 5))

const classifMeta: Record<ZoneClassification, { color: string; label: string }> = {
  LIBRE:    { color: '#38a169', label: 'Libre' },
  MODERADO: { color: '#f2894a', label: 'Moderado' },
  OCUPADO:  { color: '#e53e3e', label: 'Ocupado' },
}

const notifMeta: Record<NotificationType, { color: string; label: string }> = {
  AVAILABILITY: { color: '#38a169', label: 'Disponibilidad' },
  PREDICTION:   { color: '#3182ce', label: 'Predicción' },
  SYSTEM:       { color: '#888888', label: 'Sistema' },
  ALERT:        { color: '#e53e3e', label: 'Alerta' },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1)  return 'hace un momento'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24)   return `hace ${h} h`
  const d = Math.floor(h / 24)
  return `hace ${d} d`
}

onMounted(() => {
  zoneStore.fetchZones()
  if (userId.value) notifStore.fetchAll(userId.value)
})
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

      <div class="layout-grid">
        <!-- ───────────────── Main column ───────────────── -->
        <div class="col-main">
          <div class="section">
            <div class="section-head">
              <h2 class="section-title">Zonas monitoreadas</h2>
              <button class="link-btn" @click="router.push('/dashboard/zones')">Ver mapa →</button>
            </div>

            <div v-if="sortedZones.length === 0" class="empty-card">
              No hay zonas registradas todavía.
            </div>

            <div v-else class="zone-list">
              <button
                v-for="zone in sortedZones"
                :key="zone.id"
                class="zone-row"
                @click="router.push(`/dashboard/zones/${zone.id}`)"
              >
                <div class="zone-row-main">
                  <div class="zone-row-head">
                    <span class="zone-name">{{ zone.name }}</span>
                    <span class="zone-badge" :style="{ background: classifMeta[zone.classification].color }">
                      {{ classifMeta[zone.classification].label }}
                    </span>
                  </div>
                  <span class="zone-addr">{{ zone.street }}, {{ zone.district }}</span>
                  <div class="zone-bar">
                    <div
                      class="zone-bar-fill"
                      :style="{ width: zone.occupancyPercentage + '%', background: classifMeta[zone.classification].color }"
                    />
                  </div>
                  <div class="zone-stats">
                    <span class="stat-free">{{ zone.freeCount }} libres</span>
                    <span class="stat-sep">·</span>
                    <span class="stat-occ">{{ zone.occupiedCount }} ocupados</span>
                    <span class="stat-total">/ {{ zone.totalSpaces }}</span>
                  </div>
                </div>
                <div class="zone-row-pct">
                  <span class="pct-value">{{ Math.round(zone.occupancyPercentage) }}%</span>
                  <span class="pct-label">ocupado</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- ───────────────── Side column ───────────────── -->
        <div class="col-side">
          <div class="section card-section">
            <h2 class="section-title">Estado por clasificación</h2>
            <div class="classif-rows">
              <div class="classif-row">
                <span class="classif-dot" style="background: #38a169;"></span>
                <span class="classif-name">Libre</span>
                <span class="classif-count">{{ zonesLibre }}</span>
              </div>
              <div class="classif-row">
                <span class="classif-dot" style="background: #f2894a;"></span>
                <span class="classif-name">Moderado</span>
                <span class="classif-count">{{ zonesModerado }}</span>
              </div>
              <div class="classif-row">
                <span class="classif-dot" style="background: #e53e3e;"></span>
                <span class="classif-name">Ocupado</span>
                <span class="classif-count">{{ zonesOcupado }}</span>
              </div>
            </div>
          </div>

          <div class="section card-section">
            <h2 class="section-title">Ocupación global</h2>
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

          <div class="section card-section">
            <div class="section-head">
              <h2 class="section-title">Alertas recientes</h2>
              <button class="link-btn" @click="router.push('/dashboard/alerts')">Ver todas →</button>
            </div>

            <div v-if="notifStore.loading" class="empty-inline">Cargando alertas...</div>
            <div v-else-if="recentNotifications.length === 0" class="empty-inline">
              No tienes alertas recientes.
            </div>
            <ul v-else class="notif-list">
              <li v-for="n in recentNotifications" :key="n.id" class="notif-item">
                <span class="notif-dot" :style="{ background: notifMeta[n.type].color }" />
                <div class="notif-body">
                  <span class="notif-msg" :class="{ unread: !n.isRead }">{{ n.message }}</span>
                  <span class="notif-time">{{ notifMeta[n.type].label }} · {{ timeAgo(n.createdAt) }}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dashboard { max-width: 1340px; margin: 0 auto; }

.welcome { margin-bottom: 28px; }

.welcome-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-title);
  margin: 0 0 6px;
  text-transform: capitalize;
}

.welcome-sub {
  font-size: 13px;
  color: var(--color-muted);
  margin: 0;
}

.loading {
  color: var(--color-muted);
  font-size: 14px;
  padding: 40px 0;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.metric-card {
  background: var(--color-card);
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--shadow-card);
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
  color: var(--color-title);
  line-height: 1;
}

.metric-label {
  font-size: 12px;
  color: var(--color-muted);
}

/* ── Two-column layout ── */
.layout-grid {
  display: grid;
  grid-template-columns: 1.7fr 1fr;
  gap: 20px;
  align-items: start;
}

.section { margin-bottom: 0; }

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-title);
  margin: 0 0 14px;
}

.section-head .section-title { margin: 0; }

.link-btn {
  background: none;
  border: none;
  padding: 0;
  font-size: 13px;
  font-weight: 600;
  color: #f2894a;
  cursor: pointer;
  font-family: inherit;
  transition: color 0.2s;
}
.link-btn:hover { color: #e07a3a; }

.card-section {
  background: var(--color-card);
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--shadow-card);
}

.col-side { display: flex; flex-direction: column; gap: 20px; }

.empty-card {
  background: var(--color-card);
  border-radius: 12px;
  padding: 32px 20px;
  box-shadow: var(--shadow-card);
  text-align: center;
  color: var(--color-muted);
  font-size: 13px;
}

/* ── Zone list ── */
.zone-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.zone-row {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--color-card);
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 16px 18px;
  box-shadow: var(--shadow-card);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}
.zone-row:hover {
  border-color: #f2894a;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.zone-row-main { flex: 1; min-width: 0; }

.zone-row-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.zone-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-title);
}

.zone-badge {
  padding: 2px 9px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 700;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.zone-addr {
  font-size: 12px;
  color: var(--color-muted);
  display: block;
  margin-bottom: 10px;
}

.zone-bar {
  height: 6px;
  background: var(--color-border-soft);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.zone-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s;
}

.zone-stats {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.stat-free { color: #38a169; font-weight: 600; }
.stat-occ  { color: #e53e3e; font-weight: 600; }
.stat-sep  { color: var(--color-faint); }
.stat-total { color: var(--color-faint); }

.zone-row-pct {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  min-width: 56px;
}
.pct-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-title);
  line-height: 1;
}
.pct-label {
  font-size: 10px;
  color: var(--color-faint);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-top: 3px;
}

/* ── Classification rows ── */
.classif-rows { display: flex; flex-direction: column; gap: 4px; }

.classif-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border-soft);
}
.classif-row:last-child { border-bottom: none; }

.classif-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.classif-name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-sub);
}

.classif-count {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-title);
}

/* ── Global occupancy ── */
.global-bar-wrap {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
}

.global-bar {
  flex: 1;
  height: 12px;
  background: var(--color-border-soft);
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
  color: var(--color-title);
  min-width: 40px;
}

.global-legend { display: flex; gap: 20px; }

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-sub);
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

/* ── Notifications ── */
.notif-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 0;
  border-bottom: 1px solid var(--color-border-soft);
}
.notif-item:last-child { border-bottom: none; }

.notif-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
}

.notif-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.notif-msg {
  font-size: 13px;
  color: var(--color-sub);
  line-height: 1.35;
}
.notif-msg.unread { font-weight: 600; color: var(--color-title); }

.notif-time {
  font-size: 11px;
  color: var(--color-faint);
}

.empty-inline {
  font-size: 13px;
  color: var(--color-muted);
  padding: 8px 0;
}

@media (max-width: 1024px) {
  .layout-grid { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .metrics-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
