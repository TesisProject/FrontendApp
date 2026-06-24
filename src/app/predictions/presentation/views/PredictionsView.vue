<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { usePredictionStore } from '../../application/prediction.store'
import type { DayOfWeek } from '../../domain/model/prediction.model'
import ZoneComparisonPanel from '../components/ZoneComparisonPanel.vue'

const store = usePredictionStore()

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: 'MONDAY',    label: 'Lunes'     },
  { value: 'TUESDAY',   label: 'Martes'    },
  { value: 'WEDNESDAY', label: 'Miércoles' },
  { value: 'THURSDAY',  label: 'Jueves'    },
  { value: 'FRIDAY',    label: 'Viernes'   },
  { value: 'SATURDAY',  label: 'Sábado'    },
  { value: 'SUNDAY',    label: 'Domingo'   },
]

function formatWindow(startMinute: number, windowSize: number): string {
  const hStart = Math.floor(startMinute / 60)
  const mStart = startMinute % 60
  const end = startMinute + windowSize
  const hEnd = Math.floor(end / 60)
  const mEnd = end % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(hStart)}:${pad(mStart)} – ${pad(hEnd)}:${pad(mEnd)}`
}

function barColor(prob: number): string {
  if (prob >= 0.7) return '#38a169'
  if (prob >= 0.3) return '#f2894a'
  return '#e53e3e'
}

function classLabel(prob: number): string {
  if (prob >= 0.7) return 'Libre'
  if (prob >= 0.3) return 'Moderado'
  return 'Ocupado'
}

function formatPct(val: number): string {
  return `${Math.round(val * 100)}%`
}

const maxProb = computed(() =>
  Math.max(...store.filteredForecasts.map(f => f.availabilityProbability), 0.01)
)

function barHeight(prob: number): number {
  return Math.round((prob / maxProb.value) * 100)
}

const avgAvailability = computed(() => {
  const list = store.filteredForecasts
  if (!list.length) return 0
  return list.reduce((s, f) => s + f.availabilityProbability, 0) / list.length
})

const peakForecast = computed(() =>
  store.filteredForecasts.reduce(
    (best, f) => f.availabilityProbability > (best?.availabilityProbability ?? -1) ? f : best,
    store.filteredForecasts[0],
  )
)

async function onZoneChange(e: Event) {
  const zoneId = Number((e.target as HTMLSelectElement).value)
  await store.selectZone(zoneId)
}

async function onSpotChange(e: Event) {
  const spotId = Number((e.target as HTMLSelectElement).value)
  await store.fetchForecasts(spotId)
}

onMounted(() => store.loadZones())
</script>

<template>
  <div class="predictions-page">

    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Predicciones de ocupación</h1>
        <p class="page-subtitle">Disponibilidad estimada por ventana horaria según el modelo de IA</p>
      </div>
      <div class="badge-beta">Beta</div>
    </div>

    <!-- Controls -->
    <div class="controls-row">
      <!-- Zone selector -->
      <div class="select-wrap">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" class="select-icon">
          <path d="M21 10c0 6-9 13-9 13S3 16 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        <select class="ctrl-select" @change="onZoneChange" :disabled="!store.zones.length">
          <option value="" disabled selected>Seleccionar zona…</option>
          <option v-for="z in store.zones" :key="z.id" :value="z.id">{{ z.name }}</option>
        </select>
      </div>

      <!-- Spot selector -->
      <div class="select-wrap">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" class="select-icon">
          <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>
        </svg>
        <select class="ctrl-select" @change="onSpotChange" :disabled="!store.spots.length">
          <option value="" disabled selected>Seleccionar espacio…</option>
          <option v-for="s in store.spots" :key="s.id" :value="s.id">
            Espacio {{ s.spaceNumber }}
          </option>
        </select>
      </div>

      <!-- Day filter -->
      <div class="select-wrap" v-if="store.forecasts.length">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" class="select-icon">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <select class="ctrl-select" :value="store.selectedDay" @change="store.selectDay(($event.target as HTMLSelectElement).value as any)">
          <option v-for="d in DAYS" :key="d.value" :value="d.value">{{ d.label }}</option>
        </select>
      </div>
    </div>

    <!-- Comparación predicción IA vs cámaras (a nivel zona, ventana vigente) -->
    <ZoneComparisonPanel v-if="store.selectedZoneId" />

    <!-- Loading -->
    <div v-if="store.loading" class="center-state">
      <div class="spinner" />
      <span class="state-text">Cargando predicciones…</span>
    </div>

    <!-- Error -->
    <div v-else-if="store.error" class="center-state">
      <span class="state-text error">{{ store.error }}</span>
    </div>

    <!-- Empty: no spot selected yet -->
    <div v-else-if="!store.selectedSpotId" class="center-state">
      <span class="state-text">Selecciona una zona y un espacio para ver sus predicciones.</span>
    </div>

    <!-- Empty: spot has no forecasts for selected day -->
    <div v-else-if="!store.filteredForecasts.length" class="center-state">
      <span class="state-text">No hay predicciones disponibles para este espacio en el día seleccionado.</span>
    </div>

    <template v-else>

      <!-- Summary cards -->
      <div class="summary-grid">
        <div class="summary-card">
          <span class="summary-label">Disponibilidad promedio</span>
          <span class="summary-value" :style="{ color: barColor(avgAvailability) }">
            {{ formatPct(avgAvailability) }}
          </span>
          <span class="summary-sub">{{ DAYS.find(d => d.value === store.selectedDay)?.label }}</span>
        </div>

        <div class="summary-card">
          <span class="summary-label">Pico de disponibilidad</span>
          <span class="summary-value" :style="{ color: barColor(peakForecast?.availabilityProbability ?? 0) }">
            {{ formatPct(peakForecast?.availabilityProbability ?? 0) }}
          </span>
          <span class="summary-sub">
            {{ peakForecast ? formatWindow(peakForecast.startMinuteOfDay, peakForecast.windowSizeMinutes) : '--' }}
          </span>
        </div>

        <div class="summary-card">
          <span class="summary-label">Ventanas analizadas</span>
          <span class="summary-value info">{{ store.filteredForecasts.length }}</span>
          <span class="summary-sub">de {{ store.forecasts.length }} en total</span>
        </div>

        <div class="summary-card">
          <span class="summary-label">Versión del modelo</span>
          <span class="summary-value info" style="font-size: 18px;">v{{ store.modelVersion ?? '—' }}</span>
          <span class="summary-sub">Random Forest</span>
        </div>
      </div>

      <!-- Chart -->
      <div class="chart-card">
        <div class="chart-header">
          <span class="chart-title">Disponibilidad estimada por ventana horaria</span>
          <div class="chart-legend">
            <span class="legend-dot" style="background: #38a169" /> Libre (&ge;70%)
            <span class="legend-dot" style="background: #f2894a" /> Moderado (30–70%)
            <span class="legend-dot" style="background: #e53e3e" /> Ocupado (&lt;30%)
          </div>
        </div>

        <div class="chart">
          <div class="y-axis">
            <span>100%</span>
            <span>75%</span>
            <span>50%</span>
            <span>25%</span>
            <span>0%</span>
          </div>
          <div class="chart-body">
            <div class="grid-lines">
              <span v-for="n in 4" :key="n" class="grid-line" />
            </div>
            <div class="bars">
              <div v-for="f in store.filteredForecasts" :key="f.id" class="bar-col">
                <span class="bar-pct-label" :style="{ color: barColor(f.availabilityProbability) }">
                  {{ Math.round(f.availabilityProbability * 100) }}%
                </span>
                <div class="bar-track">
                  <div
                    class="bar-fill"
                    :style="{
                      height: barHeight(f.availabilityProbability) + '%',
                      background: barColor(f.availabilityProbability),
                    }"
                  />
                </div>
                <span class="bar-hour">{{ String(Math.floor(f.startMinuteOfDay / 60)).padStart(2, '0') }}:{{ String(f.startMinuteOfDay % 60).padStart(2, '0') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Detail table -->
      <div class="table-card">
        <h3 class="table-title">Detalle por ventana horaria</h3>
        <div class="table-wrap">
          <table class="pred-table">
            <thead>
              <tr>
                <th>Ventana</th>
                <th>Disponibilidad estimada</th>
                <th>Clasificación</th>
                <th>Modelo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in store.filteredForecasts" :key="f.id">
                <td class="td-hour">{{ formatWindow(f.startMinuteOfDay, f.windowSizeMinutes) }}</td>
                <td>
                  <div class="inline-bar-wrap">
                    <div class="inline-bar">
                      <div
                        class="inline-bar-fill"
                        :style="{ width: (f.availabilityProbability * 100) + '%', background: barColor(f.availabilityProbability) }"
                      />
                    </div>
                    <span class="inline-pct">{{ formatPct(f.availabilityProbability) }}</span>
                  </div>
                </td>
                <td>
                  <span
                    class="class-badge"
                    :style="{ background: barColor(f.availabilityProbability) + '20', color: barColor(f.availabilityProbability) }"
                  >
                    {{ classLabel(f.availabilityProbability) }}
                  </span>
                </td>
                <td class="td-model">v{{ f.modelVersion }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Model info footer -->
      <div class="model-card">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-faint); flex-shrink:0">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span class="model-info-text">
          Predicciones generadas por el modelo
          <strong>Random Forest v{{ store.modelVersion }}</strong>.
          Cada barra representa la probabilidad de que el espacio esté
          <strong>disponible</strong> durante esa ventana de {{ store.filteredForecasts[0]?.windowSizeMinutes ?? 30 }} minutos.
        </span>
      </div>

    </template>
  </div>
</template>

<style scoped>
.predictions-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-title);
  margin: 0 0 4px;
}

.page-subtitle {
  font-size: 13px;
  color: var(--color-muted);
  margin: 0;
}

.badge-beta {
  padding: 3px 10px;
  background: #3182ce18;
  color: #3182ce;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  margin-top: 4px;
}

.controls-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.select-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.select-icon {
  position: absolute;
  left: 10px;
  color: var(--color-faint);
  pointer-events: none;
}

.ctrl-select {
  padding: 8px 14px 8px 32px;
  border: 1.5px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-input-bg);
  color: var(--color-text);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  appearance: none;
  transition: border-color 0.2s;
  min-width: 180px;
}

.ctrl-select:focus { border-color: var(--color-title); }
.ctrl-select:disabled { opacity: 0.45; cursor: not-allowed; }

.center-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 0;
}

.state-text       { font-size: 14px; color: var(--color-faint); text-align: center; }
.state-text.error { color: #e53e3e; }

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-title);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.summary-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: var(--shadow-card);
}

.summary-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: var(--color-muted);
}

.summary-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.1;
}

.summary-value.info { color: #3182ce; }

.summary-sub {
  font-size: 11px;
  color: var(--color-faint);
}

.chart-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 24px;
  box-shadow: var(--shadow-card);
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 8px;
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-title);
}

.chart-legend {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
  color: var(--color-muted);
}

.legend-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
}

.chart {
  display: flex;
  gap: 8px;
  height: 200px;
}

.y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  font-size: 10px;
  color: var(--color-faint);
  padding-bottom: 22px;
  min-width: 32px;
}

.chart-body {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow-x: auto;
}

.grid-lines {
  position: absolute;
  inset: 0;
  bottom: 22px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}

.grid-line {
  display: block;
  width: 100%;
  height: 1px;
  background: var(--color-border-soft);
}

.bars {
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: 4px;
  padding-bottom: 22px;
  position: relative;
  min-width: max-content;
}

.bar-col {
  flex: 0 0 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  height: 100%;
}

.bar-pct-label {
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  height: 12px;
  display: flex;
  align-items: center;
}

.bar-track {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
}

.bar-fill {
  width: 100%;
  border-radius: 4px 4px 0 0;
  transition: height 0.5s ease;
  min-height: 3px;
}

.bar-hour {
  font-size: 9px;
  color: var(--color-faint);
  white-space: nowrap;
  position: absolute;
  bottom: 0;
}

.table-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 24px;
  box-shadow: var(--shadow-card);
}

.table-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-title);
  margin: 0 0 16px;
}

.table-wrap { overflow-x: auto; }

.pred-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.pred-table th {
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: var(--color-muted);
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border);
}

.pred-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border-soft);
  color: var(--color-text);
}

.pred-table tr:last-child td { border-bottom: none; }

.td-hour  { font-weight: 600; color: var(--color-title); font-variant-numeric: tabular-nums; }
.td-model { color: var(--color-muted); font-size: 12px; }

.inline-bar-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.inline-bar {
  flex: 1;
  height: 6px;
  background: var(--color-border-soft);
  border-radius: 4px;
  overflow: hidden;
  max-width: 160px;
}

.inline-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s;
}

.inline-pct {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-sub);
  min-width: 38px;
}

.class-badge {
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
}

.model-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: var(--color-border-soft);
  border-radius: 10px;
  padding: 14px 16px;
}

.model-info-text {
  font-size: 12px;
  color: var(--color-muted);
  line-height: 1.6;
}
</style>
