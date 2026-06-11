<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { usePredictionStore } from '../../application/prediction.store'

const store = usePredictionStore()

const maxOccupancy = computed(() =>
  Math.max(...store.predictions.map(p => p.predictedOccupancy), 0.01)
)

function barHeight(occ: number): number {
  return Math.round((occ / maxOccupancy.value) * 100)
}

function barColor(occ: number): string {
  if (occ < 0.3)  return '#38a169'
  if (occ < 0.7)  return '#f2894a'
  return '#e53e3e'
}

function classLabel(occ: number): string {
  if (occ < 0.3)  return 'Libre'
  if (occ < 0.7)  return 'Moderado'
  return 'Ocupado'
}

function formatHour(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

function formatAccuracy(val: number): string {
  return `${Math.round(val * 100)}%`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

const peakPrediction = computed(() =>
  store.predictions.reduce((max, p) =>
    p.predictedOccupancy > (max?.predictedOccupancy ?? 0) ? p : max,
    store.predictions[0]
  )
)

const avgOccupancy = computed(() => {
  if (!store.predictions.length) return 0
  const sum = store.predictions.reduce((s, p) => s + p.predictedOccupancy, 0)
  return sum / store.predictions.length
})

const avgConfidence = computed(() => {
  if (!store.predictions.length) return 0
  const sum = store.predictions.reduce((s, p) => s + p.confidenceScore, 0)
  return sum / store.predictions.length
})

function onZoneChange(e: Event) {
  const zoneId = (e.target as HTMLSelectElement).value
  store.selectZone(zoneId)
  store.fetchPredictions(zoneId)
}

watch(() => store.selectedZone.id, (id) => store.fetchPredictions(id))

onMounted(() => store.fetchPredictions(store.selectedZone.id))
</script>

<template>
  <div class="predictions-page">

    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Predicciones de ocupación</h1>
        <p class="page-subtitle">Estimaciones de disponibilidad para las próximas horas</p>
      </div>
      <div class="badge-beta">Beta</div>
    </div>

    <!-- Controls -->
    <div class="controls-row">
      <div class="select-wrap">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="select-icon">
          <circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/>
          <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>
        </svg>
        <select class="zone-select" :value="store.selectedZone.id" @change="onZoneChange">
          <option v-for="z in store.zones" :key="z.id" :value="z.id">{{ z.name }}</option>
        </select>
      </div>
      <span class="zone-label">{{ store.selectedZone.name }}</span>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="center-state">
      <div class="spinner" />
      <span class="state-text">Calculando predicciones...</span>
    </div>

    <!-- Error -->
    <div v-else-if="store.error" class="center-state">
      <span class="state-text error">{{ store.error }}</span>
    </div>

    <template v-else-if="store.predictions.length">

      <!-- Summary cards -->
      <div class="summary-grid">
        <div class="summary-card">
          <span class="summary-label">Ocupación promedio</span>
          <span class="summary-value" :style="{ color: barColor(avgOccupancy) }">
            {{ formatAccuracy(avgOccupancy) }}
          </span>
          <span class="summary-sub">próximas 12 horas</span>
        </div>

        <div class="summary-card">
          <span class="summary-label">Pico más alto</span>
          <span class="summary-value" :style="{ color: barColor(peakPrediction?.predictedOccupancy ?? 0) }">
            {{ formatAccuracy(peakPrediction?.predictedOccupancy ?? 0) }}
          </span>
          <span class="summary-sub">{{ peakPrediction ? formatHour(peakPrediction.targetDatetime) : '--' }}</span>
        </div>

        <div class="summary-card">
          <span class="summary-label">Confianza del modelo</span>
          <span class="summary-value confidence">{{ formatAccuracy(avgConfidence) }}</span>
          <span class="summary-sub">Random Forest v{{ store.activeModel?.version }}</span>
        </div>

        <div class="summary-card">
          <span class="summary-label">Precisión del modelo</span>
          <span class="summary-value confidence">{{ formatAccuracy(store.activeModel?.accuracy ?? 0) }}</span>
          <span class="summary-sub">Desplegado {{ store.activeModel ? formatDate(store.activeModel.deployedAt) : '--' }}</span>
        </div>
      </div>

      <!-- Chart -->
      <div class="chart-card">
        <div class="chart-header">
          <span class="chart-title">Ocupación estimada por hora</span>
          <div class="chart-legend">
            <span class="legend-dot" style="background: #38a169" /> Libre
            <span class="legend-dot" style="background: #f2894a" /> Moderado
            <span class="legend-dot" style="background: #e53e3e" /> Ocupado
          </div>
        </div>

        <div class="chart">
          <!-- Y axis labels -->
          <div class="y-axis">
            <span>100%</span>
            <span>75%</span>
            <span>50%</span>
            <span>25%</span>
            <span>0%</span>
          </div>

          <!-- Grid + bars -->
          <div class="chart-body">
            <div class="grid-lines">
              <span v-for="n in 4" :key="n" class="grid-line" />
            </div>
            <div class="bars">
              <div
                v-for="p in store.predictions"
                :key="p.id"
                class="bar-col"
              >
                <span class="bar-pct-label" :style="{ color: barColor(p.predictedOccupancy) }">
                  {{ Math.round(p.predictedOccupancy * 100) }}%
                </span>
                <div class="bar-track">
                  <div
                    class="bar-fill"
                    :style="{
                      height: barHeight(p.predictedOccupancy) + '%',
                      background: barColor(p.predictedOccupancy),
                    }"
                  />
                </div>
                <span class="bar-hour">{{ formatHour(p.targetDatetime) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Hourly table -->
      <div class="table-card">
        <h3 class="table-title">Detalle por hora</h3>
        <div class="table-wrap">
          <table class="pred-table">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Ocupación estimada</th>
                <th>Clasificación</th>
                <th>Confianza</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in store.predictions" :key="p.id">
                <td class="td-hour">{{ formatHour(p.targetDatetime) }}</td>
                <td>
                  <div class="inline-bar-wrap">
                    <div class="inline-bar">
                      <div
                        class="inline-bar-fill"
                        :style="{ width: (p.predictedOccupancy * 100) + '%', background: barColor(p.predictedOccupancy) }"
                      />
                    </div>
                    <span class="inline-pct">{{ Math.round(p.predictedOccupancy * 100) }}%</span>
                  </div>
                </td>
                <td>
                  <span class="class-badge" :style="{ background: barColor(p.predictedOccupancy) + '20', color: barColor(p.predictedOccupancy) }">
                    {{ classLabel(p.predictedOccupancy) }}
                  </span>
                </td>
                <td class="td-confidence">{{ formatAccuracy(p.confidenceScore) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Model info -->
      <div class="model-card">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-faint); flex-shrink:0">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span class="model-info-text">
          Predicciones generadas por el modelo <strong>Random Forest v{{ store.activeModel?.version }}</strong>
          con una precisión del <strong>{{ formatAccuracy(store.activeModel?.accuracy ?? 0) }}</strong>
          sobre datos históricos de ocupación.
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

/* Header */
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

/* Controls */
.controls-row {
  display: flex;
  align-items: center;
  gap: 12px;
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

.zone-select {
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
}

.zone-select:focus { border-color: var(--color-title); }

.zone-label {
  font-size: 13px;
  color: var(--color-muted);
}

/* States */
.center-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 0;
}

.state-text       { font-size: 14px; color: var(--color-faint); }
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

/* Summary grid */
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

.summary-value.confidence { color: #3182ce; }

.summary-sub {
  font-size: 11px;
  color: var(--color-faint);
}

/* Chart card */
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

/* Chart body */
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
  gap: 6px;
  padding-bottom: 22px;
  position: relative;
}

.bar-col {
  flex: 1;
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

/* Table */
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

.td-hour { font-weight: 600; color: var(--color-title); }

.td-confidence { color: #3182ce; font-weight: 600; }

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
  min-width: 34px;
}

.class-badge {
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
}

/* Model info */
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
