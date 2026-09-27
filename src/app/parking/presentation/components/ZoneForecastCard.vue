<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { predictionApi } from '../../../predictions/infrastructure/prediction-api'
import { toForecast } from '../../../predictions/infrastructure/prediction-assembler'
import type { DayOfWeek, OccupancyForecast } from '../../../predictions/domain/model/prediction.model'
import type { ZoneOccupancyHistoryPointResponse } from '../../infrastructure/availability-response'

const props = defineProps<{
  spotIds: number[]
  /** Frames reales de ocupación (el backend guarda los últimos 30 días). */
  history: ZoneOccupancyHistoryPointResponse[]
  /** El historial no se pudo leer (p. ej. 403 para el rol USER): no se puede comparar con la realidad. */
  historyUnavailable?: boolean
}>()

// Peticiones simultáneas máximas al pedir los pronósticos de cada espacio.
const BATCH_SIZE = 10

// Una predicción "acierta" si la disponibilidad real de esa hora quedó dentro de este margen (puntos %).
const HIT_TOLERANCE_PCT = 20
// El historial real del backend cubre 30 días (hoy incluido).
const HISTORY_DAYS = 30

const JS_TO_BACKEND_DAY: DayOfWeek[] = [
  'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY',
]

const forecasts = ref<OccupancyForecast[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const currentHour = new Date().getHours()

/** Fecha local en formato YYYY-MM-DD (el que usa <input type="date">). */
function toIsoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Los pronósticos se repiten por día de la semana: hacia adelante basta con 7 días; hacia atrás,
// lo que cubre el historial real para poder comparar.
const todayDate = new Date()
const todayIso = toIsoDate(todayDate)
const earliestDate = toIsoDate(new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() - (HISTORY_DAYS - 1)))
const maxDate = toIsoDate(new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + 6))
const selectedDate = ref(todayIso)

const selectedDay = computed(() => {
  const [y, m, d] = selectedDate.value.split('-').map(Number)
  return JS_TO_BACKEND_DAY[new Date(y, m - 1, d).getDay()]
})
const isToday = computed(() => selectedDate.value === todayIso)
const isPast = computed(() => selectedDate.value < todayIso)
const dateLabel = computed(() => (isToday.value ? 'hoy' : isPast.value ? 'día pasado' : 'fecha elegida'))

function onDateChange(e: Event) {
  const value = (e.target as HTMLInputElement).value
  // Un campo vacío o fuera de rango vuelve a hoy en vez de dejar el card sin día.
  selectedDate.value = value >= earliestDate && value <= maxDate ? value : todayIso
}

interface ActualHour {
  pct: number
  free: number
  occupied: number
  total: number
}

/** Lectura real por hora del día elegido, promediando los frames de las cámaras. */
const actualByHour = computed(() => {
  const acc = new Map<number, { occupied: number; total: number }[]>()
  for (const p of props.history) {
    const at = new Date(p.occurredAt)
    if (toIsoDate(at) !== selectedDate.value || p.totalSpots <= 0) continue
    const hour = at.getHours()
    acc.set(hour, [...(acc.get(hour) ?? []), { occupied: p.occupiedSpots, total: p.totalSpots }])
  }
  const result = new Map<number, ActualHour>()
  for (const [hour, frames] of acc) {
    const total = Math.max(...frames.map(f => f.total))
    const occupied = Math.min(total, Math.round(frames.reduce((s, f) => s + f.occupied, 0) / frames.length))
    result.set(hour, { pct: Math.round(((total - occupied) / total) * 100), free: total - occupied, occupied, total })
  }
  return result
})

// VALORES DE EJEMPLO: el backend aún no expone métricas del modelo (solo su versión).
// Reemplazar por datos reales cuando existan.
const MODEL_TRAINING_PCT = 82
const MODEL_RELIABILITY_PCT = 74

const modelVersion = computed(() => forecasts.value[0]?.modelVersion ?? null)

/** Promedia las ventanas (15/30 min) de todos los espacios, agrupadas por hora del día elegido. */
const rows = computed(() => {
  const byHour = new Map<number, number[]>()
  for (const f of forecasts.value) {
    if (f.dayOfWeek !== selectedDay.value) continue
    const hour = Math.floor(f.startMinuteOfDay / 60)
    byHour.set(hour, [...(byHour.get(hour) ?? []), f.availabilityProbability])
  }
  return [...byHour.entries()]
    .sort(([a], [b]) => a - b)
    .map(([hour, probs]) => {
      const pct = Math.round((probs.reduce((s, p) => s + p, 0) / probs.length) * 100)
      // Solo se evalúan horas ya terminadas y con lecturas reales.
      const elapsed = isPast.value || (isToday.value && hour < currentHour)
      const actual = elapsed ? actualByHour.value.get(hour) : undefined
      const verdict = actual === undefined ? null : Math.abs(pct - actual.pct) <= HIT_TOLERANCE_PCT ? 'hit' : 'miss'
      // Espacios libres/ocupados que implica el porcentaje predicho, sobre el total de esa hora.
      const predictedFree = actual ? Math.round((pct / 100) * actual.total) : null
      const predicted = actual && predictedFree !== null
        ? { free: predictedFree, occupied: actual.total - predictedFree }
        : null
      return { hour, label: `${String(hour).padStart(2, '0')}:00`, pct, actual, predicted, verdict }
    })
})

const showComparison = computed(() => (isPast.value || isToday.value) && !props.historyUnavailable)

/** Hay horas que ya pasaron y que, por tanto, deberían poder compararse con la realidad. */
const hasElapsedHours = computed(() =>
  !props.historyUnavailable && rows.value.some(r => isPast.value || (isToday.value && r.hour < currentHour)),
)

const evaluation = computed(() => {
  const evaluated = rows.value.filter(r => r.verdict)
  return { total: evaluated.length, hits: evaluated.filter(r => r.verdict === 'hit').length }
})

function barColor(pct: number): string {
  if (pct >= 70) return '#38a169'
  if (pct >= 30) return '#f2894a'
  return '#e53e3e'
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

async function fetchAll(spotIds: number[]): Promise<OccupancyForecast[]> {
  const all: OccupancyForecast[] = []
  let failed = 0
  for (let i = 0; i < spotIds.length; i += BATCH_SIZE) {
    const results = await Promise.allSettled(
      spotIds.slice(i, i + BATCH_SIZE).map(id => predictionApi.getBySpot(id)),
    )
    for (const r of results) {
      if (r.status === 'fulfilled') all.push(...r.value.map(toForecast))
      else failed++
    }
  }
  // Si algunos espacios fallan se muestra lo que sí llegó; solo es error si falló todo.
  if (failed === spotIds.length) throw new Error('all failed')
  return all
}

// La clave evita re-consultar cuando el store refresca los espacios (mismos ids, nuevo array).
watch(
  () => props.spotIds.join(','),
  async () => {
    const spotIds = [...props.spotIds]
    forecasts.value = []
    error.value = null
    if (spotIds.length === 0) return
    loading.value = true
    try {
      const result = await fetchAll(spotIds)
      // Descarta la respuesta si mientras tanto cambió la lista de espacios.
      if (spotIds.join(',') === props.spotIds.join(',')) forecasts.value = result
    } catch {
      error.value = 'No se pudieron cargar las predicciones.'
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="section-card">
    <div class="forecast-head">
      <div>
        <h2 class="section-title">Predicciones</h2>
        <p class="forecast-sub">Probabilidad de espacios disponibles por hora ({{ dateLabel }})</p>
      </div>
      <input
        class="date-input"
        type="date"
        :value="selectedDate"
        :min="earliestDate"
        :max="maxDate"
        aria-label="Fecha de la predicción"
        @change="onDateChange"
      />
    </div>

    <div v-if="loading" class="section-state">Cargando predicciones...</div>
    <div v-else-if="error" class="section-state error">{{ error }}</div>
    <div v-else-if="rows.length === 0" class="section-state">
      Aún no hay predicciones para {{ isToday ? 'hoy' : 'este día' }} en esta zona.
    </div>

    <template v-else>
      <p v-if="evaluation.total > 0" class="evaluation">
        Acertó en <strong>{{ evaluation.hits }} de {{ evaluation.total }}</strong> horas con lectura real
        <span class="evaluation-note">· margen ±{{ HIT_TOLERANCE_PCT }} pts</span>
      </p>
      <p v-else-if="hasElapsedHours" class="evaluation">
        Sin lecturas de las cámaras para {{ isToday ? 'las horas ya transcurridas' : 'este día' }}:
        no se puede comprobar si la predicción acertó.
      </p>

      <div class="forecast-table" :class="{ 'forecast-table--compare': showComparison }">
        <div class="forecast-row forecast-row--head" aria-hidden="true">
          <span>Hora</span>
          <span>Disponibilidad</span>
          <span />
          <template v-if="showComparison">
            <span class="col-count">Predicción</span>
            <span class="col-count">Real</span>
            <span />
          </template>
        </div>

        <div
          v-for="row in rows"
          :key="row.hour"
          class="forecast-row"
          :class="{ 'forecast-row--now': isToday && row.hour === currentHour }"
        >
          <span class="forecast-hour">{{ row.label }}</span>
          <div class="forecast-bar">
            <div class="forecast-fill" :style="{ width: row.pct + '%', background: barColor(row.pct) }" />
          </div>
          <span class="forecast-pct">{{ row.pct }}%</span>

          <template v-if="showComparison">
            <span class="col-count col-count--muted">
              <template v-if="row.predicted">
                {{ plural(row.predicted.free, 'libre', 'libres') }} · {{ plural(row.predicted.occupied, 'ocup.', 'ocup.') }}
              </template>
            </span>
            <span class="col-count">
              <template v-if="row.actual">
                {{ plural(row.actual.free, 'libre', 'libres') }} · {{ plural(row.actual.occupied, 'ocup.', 'ocup.') }}
              </template>
            </span>
            <span
              v-if="row.verdict"
              class="verdict"
              :class="`verdict--${row.verdict}`"
              role="img"
              :aria-label="row.verdict === 'hit' ? 'Acertó' : 'Falló'"
              :title="row.verdict === 'hit' ? 'La predicción acertó' : 'La predicción falló'"
            >
              <svg v-if="row.verdict === 'hit'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </span>
            <span v-else />
          </template>
        </div>
      </div>

      <div class="model-info">
        <div class="metric">
          <span class="metric-label">Entrenamiento</span>
          <div class="forecast-bar forecast-bar--thin">
            <div class="forecast-fill metric-fill" :style="{ width: MODEL_TRAINING_PCT + '%' }" />
          </div>
          <strong>{{ MODEL_TRAINING_PCT }}%</strong>
        </div>
        <div class="metric">
          <span class="metric-label">Confiabilidad</span>
          <div class="forecast-bar forecast-bar--thin">
            <div class="forecast-fill metric-fill" :style="{ width: MODEL_RELIABILITY_PCT + '%' }" />
          </div>
          <strong>{{ MODEL_RELIABILITY_PCT }}%</strong>
        </div>
      </div>

      <p class="disclaimer">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>
          Las predicciones son generadas por inteligencia artificial y pueden contener errores.
          <template v-if="modelVersion">· Modelo v{{ modelVersion }}</template>
        </span>
      </p>
    </template>
  </div>
</template>

<style scoped>
.section-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e8e8e8;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.forecast-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  color: #092c4c;
  margin: 0;
}

.forecast-sub {
  font-size: 12px;
  color: #8a94a0;
  margin: 2px 0 0;
}

.date-input {
  padding: 5px 10px;
  border: 1.5px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  color: #092c4c;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.date-input:hover,
.date-input:focus-visible {
  border-color: #092c4c;
  outline: none;
}

.section-state {
  font-size: 13px;
  color: #aaa;
  padding: 20px 0;
  text-align: center;
}
.section-state.error {
  color: #e53e3e;
}

.evaluation {
  margin: 0 0 10px;
  font-size: 12px;
  color: #6b7785;
}
.evaluation strong {
  color: #092c4c;
}
.evaluation-note {
  color: #a0a8b3;
}

/* Tabla: filas finas separadas por una línea, columnas alineadas con una cabecera. */
.forecast-row {
  display: grid;
  grid-template-columns: 44px 1fr 38px;
  align-items: center;
  gap: 12px;
  padding: 5px 8px;
  border-bottom: 1px solid #f3f4f6;
}
.forecast-table--compare .forecast-row {
  grid-template-columns: 44px 1fr 38px 128px 128px 20px;
}
.forecast-row:last-child {
  border-bottom: none;
}
.forecast-row--now {
  background: #f0f4f8;
  border-radius: 6px;
}
.forecast-row--head {
  padding-top: 0;
  padding-bottom: 6px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: #a0a8b3;
}

.forecast-hour {
  font-size: 12.5px;
  font-weight: 600;
  color: #092c4c;
  font-variant-numeric: tabular-nums;
}

.forecast-bar {
  height: 8px;
  background: #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
}
.forecast-bar--thin {
  height: 6px;
}

.forecast-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.5s ease;
}

.forecast-pct {
  font-size: 12px;
  font-weight: 700;
  color: #092c4c;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.col-count {
  font-size: 11.5px;
  color: #092c4c;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.col-count--muted {
  color: #8a94a0;
}

.verdict {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.verdict--hit {
  background: #e6f7ee;
  color: #2f855a;
}
.verdict--miss {
  background: #fde8e8;
  color: #c53030;
}

/* Métricas del modelo en una sola línea, sin cajas. */
.model-info {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.metric {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}
.metric-label {
  color: #6b7785;
}
.metric strong {
  color: #092c4c;
  font-variant-numeric: tabular-nums;
}
.metric-fill {
  background: #092c4c;
}

.disclaimer {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 10px 0 0;
  font-size: 11.5px;
  line-height: 1.4;
  color: #8a94a0;
}
.disclaimer svg {
  flex-shrink: 0;
  margin-top: 2px;
}

@media (max-width: 800px) {
  /* En pantallas angostas se oculta la columna "Predicción" para que no se apiñe. */
  .forecast-table--compare .forecast-row {
    grid-template-columns: 44px 1fr 38px 128px 20px;
  }
  .forecast-table--compare .forecast-row > :nth-child(4) {
    display: none;
  }
  .model-info {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
</style>
