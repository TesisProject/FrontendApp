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

// Signature element: an occupancy ring gauge per zone. Geometry shared by all rings.
const RING_R = 22
const RING_C = 2 * Math.PI * RING_R
function ringOffset(pct: number): number {
  const clamped = Math.min(100, Math.max(0, pct))
  return RING_C * (1 - clamped / 100)
}

// `color` drives bars/dots/rings; `badgeBg`/`badgeText` give status pills an AA-compliant
// tint + dark-text combo (solid color + white text failed contrast for small bold text)
const classifMeta: Record<
  ZoneClassification,
  { color: string; label: string; badgeBg: string; badgeText: string }
> = {
  LIBRE:    { color: '#38a169', label: 'Libre',    badgeBg: '#e7f6ee', badgeText: '#1c7c4a' },
  MODERADO: { color: '#f2894a', label: 'Moderado', badgeBg: '#fbeada', badgeText: '#b3540f' },
  OCUPADO:  { color: '#e53e3e', label: 'Ocupado',  badgeBg: '#fdeaea', badgeText: '#c12c2c' },
}

const notifMeta: Record<NotificationType, { color: string; label: string }> = {
  AVAILABILITY: { color: '#38a169', label: 'Disponibilidad' },
  PREDICTION:   { color: '#3182ce', label: 'Predicción' },
  SYSTEM:       { color: '#64748b', label: 'Sistema' },
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
    <header class="welcome">
      <div class="welcome-text">
        <span class="welcome-eyebrow">
          <span class="live-dot" aria-hidden="true"></span>
          Panel en vivo
        </span>
        <h1 class="welcome-title">Hola, {{ authStore.user?.email?.split('@')[0] }}</h1>
        <p class="welcome-sub">El estado de los estacionamientos, en tiempo real</p>
      </div>
      <div class="welcome-meter" aria-hidden="true">
        <span class="welcome-meter-pct">{{ globalOccupancy }}<span class="welcome-meter-unit">%</span></span>
        <span class="welcome-meter-label">ocupación ahora</span>
      </div>
    </header>

    <div v-if="zoneStore.zonesLoading" class="loading">Cargando métricas...</div>

    <template v-else>
      <div class="metrics-grid">
        <div class="metric-card" style="--accent: #3182ce; --accent-tint: #ebf8ff;">
          <div class="metric-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div class="metric-info">
            <span class="metric-value">{{ totalZones }}</span>
            <span class="metric-label">Zonas registradas</span>
          </div>
        </div>

        <div class="metric-card" style="--accent: #38a169; --accent-tint: #f0fff4;">
          <div class="metric-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div class="metric-info">
            <span class="metric-value">{{ totalFree }}</span>
            <span class="metric-label">Espacios libres</span>
          </div>
        </div>

        <div class="metric-card" style="--accent: #e53e3e; --accent-tint: #fff5f5;">
          <div class="metric-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <div class="metric-info">
            <span class="metric-value">{{ totalOccupied }}</span>
            <span class="metric-label">Espacios ocupados</span>
          </div>
        </div>

        <div class="metric-card" style="--accent: #f2894a; --accent-tint: #fffbeb;">
          <div class="metric-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          </div>
          <div class="metric-info">
            <span class="metric-value">{{ globalOccupancy }}<span class="metric-unit">%</span></span>
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
                <div class="zone-gauge">
                  <svg class="gauge-svg" viewBox="0 0 52 52" aria-hidden="true">
                    <circle class="gauge-track" cx="26" cy="26" :r="RING_R" />
                    <circle
                      class="gauge-fill"
                      cx="26"
                      cy="26"
                      :r="RING_R"
                      :style="{
                        stroke: classifMeta[zone.classification].color,
                        strokeDasharray: RING_C,
                        strokeDashoffset: ringOffset(zone.occupancyPercentage),
                      }"
                    />
                  </svg>
                  <span class="gauge-pct">{{ Math.round(zone.occupancyPercentage) }}<span class="gauge-unit">%</span></span>
                </div>

                <div class="zone-row-main">
                  <div class="zone-row-head">
                    <span class="zone-name">{{ zone.name }}</span>
                    <span
                      class="zone-badge"
                      :style="{
                        background: classifMeta[zone.classification].badgeBg,
                        color: classifMeta[zone.classification].badgeText,
                      }"
                    >
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

                <span class="zone-go" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
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
              <span class="global-pct">{{ globalOccupancy }}<span class="global-pct-unit">%</span></span>
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
.dashboard {
  --font-display: 'Space Grotesk', 'Inter', sans-serif;
  max-width: 1340px;
  margin: 0 auto;
}

/* ── Welcome header ── */
.welcome {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
}

.welcome-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-accent-text);
  margin-bottom: 8px;
}

.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #16b178;
  box-shadow: 0 0 0 0 rgba(22, 177, 120, 0.5);
  animation: live-pulse 2s ease-out infinite;
}
@keyframes live-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(22, 177, 120, 0.45); }
  70%  { box-shadow: 0 0 0 7px rgba(22, 177, 120, 0); }
  100% { box-shadow: 0 0 0 0 rgba(22, 177, 120, 0); }
}

.welcome-title {
  font-family: var(--font-display);
  font-size: 27px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-title);
  margin: 0 0 5px;
  text-transform: capitalize;
}

.welcome-sub {
  font-size: 13px;
  color: var(--color-muted);
  margin: 0;
}

.welcome-meter {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
  line-height: 1;
}
.welcome-meter-pct {
  font-family: var(--font-display);
  font-size: 34px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-title);
  font-feature-settings: 'tnum' 1;
}
.welcome-meter-unit { font-size: 18px; color: var(--color-muted); margin-left: 1px; }
.welcome-meter-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-muted);
  margin-top: 6px;
}

.loading {
  color: var(--color-muted);
  font-size: 14px;
  padding: 40px 0;
}

/* ── Metric cards ── */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.metric-card {
  position: relative;
  background: var(--color-card);
  border: 1px solid var(--color-border-soft);
  border-radius: 16px;
  padding: 20px;
  box-shadow: var(--shadow-card);
  display: flex;
  align-items: center;
  gap: 16px;
  overflow: hidden;
  transition: transform 0.22s cubic-bezier(0.22, 0.61, 0.36, 1), box-shadow 0.22s;
}
/* signature accent: a soft vertical seam in the card's own color */
.metric-card::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: var(--accent);
  opacity: 0.85;
}
.metric-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12);
}

.metric-icon {
  width: 48px;
  height: 48px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--accent-tint);
  color: var(--accent);
}
html.dark .metric-icon {
  background: color-mix(in srgb, var(--accent) 20%, transparent);
}

.metric-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.metric-value {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-title);
  line-height: 1;
  font-feature-settings: 'tnum' 1;
}
.metric-unit { font-size: 18px; color: var(--color-muted); margin-left: 1px; }

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
  letter-spacing: -0.01em;
}

.section-head .section-title { margin: 0; }

.link-btn {
  background: none;
  border: none;
  padding: 2px 4px;
  margin: -2px -4px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-accent-text);
  cursor: pointer;
  font-family: inherit;
  transition: color 0.2s;
}
.link-btn:hover { color: var(--color-accent-text-hover); }
.link-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.card-section {
  background: var(--color-card);
  border: 1px solid var(--color-border-soft);
  border-radius: 16px;
  padding: 20px;
  box-shadow: var(--shadow-card);
}

.col-side { display: flex; flex-direction: column; gap: 20px; }

.empty-card {
  background: var(--color-card);
  border: 1px solid var(--color-border-soft);
  border-radius: 16px;
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
  gap: 18px;
  background: var(--color-card);
  border: 1px solid var(--color-border-soft);
  border-radius: 16px;
  padding: 16px 18px;
  box-shadow: var(--shadow-card);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}
.zone-row:hover {
  border-color: var(--color-primary);
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.1);
  transform: translateY(-2px);
}
.zone-row:hover .zone-go { color: var(--color-primary); transform: translateX(2px); }
.zone-row:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-color: var(--color-primary);
}

/* signature: occupancy ring gauge */
.zone-gauge {
  position: relative;
  width: 54px;
  height: 54px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
}
.gauge-svg {
  width: 54px;
  height: 54px;
  transform: rotate(-90deg);
}
.gauge-track {
  fill: none;
  stroke: var(--color-border-soft);
  stroke-width: 5;
}
.gauge-fill {
  fill: none;
  stroke-width: 5;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.7s cubic-bezier(0.22, 0.61, 0.36, 1);
}
.gauge-pct {
  position: absolute;
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
  color: var(--color-title);
  font-feature-settings: 'tnum' 1;
}
.gauge-unit { font-size: 8px; color: var(--color-muted); }

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
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
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
  transition: width 0.6s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.zone-stats {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.stat-free { color: #2f855a; font-weight: 600; }
.stat-occ  { color: #c53030; font-weight: 600; }
.stat-sep  { color: var(--color-faint); }
.stat-total { color: var(--color-muted); }

.zone-go {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  color: var(--color-faint);
  transition: color 0.2s, transform 0.2s;
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
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  color: var(--color-title);
  font-feature-settings: 'tnum' 1;
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
  transition: width 0.6s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.global-pct {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  color: var(--color-title);
  min-width: 40px;
  font-feature-settings: 'tnum' 1;
}
.global-pct-unit { font-size: 12px; color: var(--color-muted); }

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
  color: var(--color-muted);
}

.empty-inline {
  font-size: 13px;
  color: var(--color-muted);
  padding: 8px 0;
}

/* ── Entrance: a single restrained page-load stagger ── */
.metric-card,
.zone-row {
  animation: card-rise 0.5s cubic-bezier(0.22, 0.61, 0.36, 1) both;
}
.metric-card:nth-child(1) { animation-delay: 0.02s; }
.metric-card:nth-child(2) { animation-delay: 0.08s; }
.metric-card:nth-child(3) { animation-delay: 0.14s; }
.metric-card:nth-child(4) { animation-delay: 0.20s; }
.zone-row:nth-child(1) { animation-delay: 0.10s; }
.zone-row:nth-child(2) { animation-delay: 0.16s; }
.zone-row:nth-child(3) { animation-delay: 0.22s; }
.zone-row:nth-child(4) { animation-delay: 0.28s; }
.zone-row:nth-child(n+5) { animation-delay: 0.34s; }
@keyframes card-rise {
  from { opacity: 0; transform: translateY(10px); }
}

@media (max-width: 1024px) {
  .layout-grid { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .metrics-grid { grid-template-columns: repeat(2, 1fr); }
  .welcome { flex-direction: column; align-items: flex-start; gap: 16px; }
  .welcome-meter { align-items: flex-start; }
}

@media (prefers-reduced-motion: reduce) {
  .metric-card,
  .zone-row { animation: none; }
  .live-dot { animation: none; }
  .gauge-fill,
  .zone-bar-fill,
  .global-bar-fill { transition: none; }
}
</style>
