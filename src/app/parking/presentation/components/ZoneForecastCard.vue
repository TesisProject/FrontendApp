<script setup lang="ts">
import { Check, Info, X } from '@lucide/vue'
import { Input } from '@/app/shared/presentation/components/ui/input'
import SectionCard from '../../../shared/presentation/components/SectionCard.vue'
import StateMessage from '../../../shared/presentation/components/StateMessage.vue'
import OccupancyMeter from './OccupancyMeter.vue'
import { computed, ref, watch } from 'vue'
import { predictionApi } from '../../../predictions/infrastructure/prediction-api'
import { toForecast, toModelMetrics } from '../../../predictions/infrastructure/prediction-assembler'
import type { DayOfWeek, ZoneForecast, ZoneModelMetrics } from '../../../predictions/domain/model/prediction.model'
import type { ZoneOccupancyHistoryPointResponse } from '../../infrastructure/availability-response'

const props = defineProps<{
  zoneId: number
  /** Frames reales de ocupación (el backend guarda los últimos 30 días). */
  history: ZoneOccupancyHistoryPointResponse[]
  /** El historial no se pudo leer (p. ej. 403 para el rol USER): no se puede comparar con la realidad. */
  historyUnavailable?: boolean
}>()

// Una predicción "acierta" si la disponibilidad real de esa hora quedó dentro de este margen (puntos %).
const HIT_TOLERANCE_PCT = 20
// El historial real del backend cubre 30 días (hoy incluido).
const HISTORY_DAYS = 30

const JS_TO_BACKEND_DAY: DayOfWeek[] = [
  'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY',
]

const forecasts = ref<ZoneForecast[]>([])
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

// Métricas del modelo calculadas por el backend. Si la petición falla se ocultan solo estas barras.
const metrics = ref<ZoneModelMetrics | null>(null)

const modelBars = computed(() => [
  { label: 'Entrenamiento', pct: metrics.value?.trainingPct ?? null },
  { label: 'Confiabilidad', pct: metrics.value?.reliabilityPct ?? null },
])

watch(
  () => props.zoneId,
  async zoneId => {
    metrics.value = null
    try {
      const result = toModelMetrics(await predictionApi.getZoneModelMetrics(zoneId))
      // Descarta la respuesta si mientras tanto cambió la zona.
      if (zoneId === props.zoneId) metrics.value = result
    } catch {
      // Sin métricas no se muestran las barras; el resto del card sigue funcionando.
    }
  },
  { immediate: true },
)

const modelVersion = computed(() => forecasts.value[0]?.modelVersion ?? null)

/** Promedia las ventanas (15/30 min) del pronóstico de la zona, agrupadas por hora del día elegido. */
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

// Hora · barra · % [· predicción · real · veredicto]; en móvil se oculta "Predicción".
const rowGrid = computed(() => [
  'grid items-center gap-3 px-2 py-[5px]',
  showComparison.value
    ? 'grid-cols-[44px_1fr_38px_128px_20px] md:grid-cols-[44px_1fr_38px_128px_128px_20px] max-md:[&>:nth-child(4)]:hidden'
    : 'grid-cols-[44px_1fr_38px]',
])

watch(
  () => props.zoneId,
  async zoneId => {
    forecasts.value = []
    error.value = null
    loading.value = true
    try {
      const result = (await predictionApi.getZoneForecasts(zoneId)).map(toForecast)
      // Descarta la respuesta si mientras tanto cambió la zona.
      if (zoneId === props.zoneId) forecasts.value = result
    } catch {
      if (zoneId === props.zoneId) error.value = 'No se pudieron cargar las predicciones.'
    } finally {
      if (zoneId === props.zoneId) loading.value = false
    }
  },
  { immediate: true },
)
</script>

<template>
  <SectionCard title="Predicciones" :sub="`Probabilidad de espacios disponibles por hora (${dateLabel})`">
    <template #actions>
      <Input
        type="date"
        :model-value="selectedDate"
        :min="earliestDate"
        :max="maxDate"
        aria-label="Fecha de la predicción"
        class="h-8 w-auto cursor-pointer px-2.5 text-[13px] text-heading"
        @change="onDateChange"
      />
    </template>

    <StateMessage v-if="loading" compact>Cargando predicciones...</StateMessage>
    <StateMessage v-else-if="error" tone="error" compact>{{ error }}</StateMessage>
    <StateMessage v-else-if="rows.length === 0" tone="empty" compact>
      Aún no hay predicciones para {{ isToday ? 'hoy' : 'este día' }} en esta zona.
    </StateMessage>

    <template v-else>
      <p v-if="evaluation.total > 0" class="mb-2.5 text-xs text-muted-foreground">
        Acertó en <strong class="text-heading">{{ evaluation.hits }} de {{ evaluation.total }}</strong> horas con lectura real
        <span class="opacity-70">· margen ±{{ HIT_TOLERANCE_PCT }} pts</span>
      </p>
      <p v-else-if="hasElapsedHours" class="mb-2.5 text-xs text-muted-foreground">
        Sin lecturas de las cámaras para {{ isToday ? 'las horas ya transcurridas' : 'este día' }}:
        no se puede comprobar si la predicción acertó.
      </p>

      <div role="table" aria-label="Predicción por hora">
        <div :class="[rowGrid, 'pt-0 pb-1.5 text-[10.5px] font-semibold tracking-[0.4px] text-muted-foreground uppercase']" role="row">
          <span role="columnheader">Hora</span>
          <span role="columnheader">Disponibilidad</span>
          <span />
          <template v-if="showComparison">
            <span role="columnheader">Predicción</span>
            <span role="columnheader">Real</span>
            <span />
          </template>
        </div>

        <div
          v-for="row in rows"
          :key="row.hour"
          :class="[rowGrid, 'border-b border-border/50 last:border-b-0', isToday && row.hour === currentHour && 'rounded-md bg-muted']"
          role="row"
          :aria-current="isToday && row.hour === currentHour ? 'time' : undefined"
        >
          <span class="text-[12.5px] font-semibold text-heading tabular-nums" role="cell">{{ row.label }}</span>
          <span role="cell"><OccupancyMeter :percentage="row.pct" :color="barColor(row.pct)" class="h-2" /></span>
          <span class="text-right text-xs font-bold text-heading tabular-nums" role="cell">{{ row.pct }}%</span>

          <template v-if="showComparison">
            <span class="text-[11.5px] whitespace-nowrap text-muted-foreground tabular-nums" role="cell">
              <template v-if="row.predicted">
                {{ plural(row.predicted.free, 'libre', 'libres') }} · {{ plural(row.predicted.occupied, 'ocup.', 'ocup.') }}
              </template>
            </span>
            <span class="text-[11.5px] whitespace-nowrap text-heading tabular-nums" role="cell">
              <template v-if="row.actual">
                {{ plural(row.actual.free, 'libre', 'libres') }} · {{ plural(row.actual.occupied, 'ocup.', 'ocup.') }}
              </template>
            </span>
            <span
              v-if="row.verdict"
              class="inline-flex size-[18px] items-center justify-center rounded-full"
              :class="row.verdict === 'hit' ? 'bg-success-soft text-success' : 'bg-destructive-soft text-destructive'"
              role="img"
              :aria-label="row.verdict === 'hit' ? 'Acertó' : 'Falló'"
              :title="row.verdict === 'hit' ? 'La predicción acertó' : 'La predicción falló'"
            >
              <Check v-if="row.verdict === 'hit'" class="size-3" :stroke-width="3.5" />
              <X v-else class="size-3" :stroke-width="3.5" />
            </span>
            <span v-else />
          </template>
        </div>
      </div>

      <div v-if="metrics" class="mt-3.5 grid gap-2.5 border-t pt-3 md:grid-cols-2 md:gap-6">
        <div v-for="bar in modelBars" :key="bar.label" class="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 text-xs">
          <span class="text-muted-foreground">{{ bar.label }}</span>
          <OccupancyMeter :percentage="bar.pct ?? 0" color="var(--heading)" />
          <strong v-if="bar.pct !== null" class="text-heading tabular-nums">{{ bar.pct }}%</strong>
          <span v-else class="text-[11.5px] text-muted-foreground" title="Aún no hay datos suficientes para calcularlo">
            Sin datos suficientes
          </span>
        </div>
      </div>

      <p class="mt-2.5 flex items-start gap-1.5 text-[11.5px] leading-snug text-muted-foreground">
        <Info class="mt-0.5 size-[13px] shrink-0" aria-hidden="true" />
        <span>
          Las predicciones son generadas por inteligencia artificial y pueden contener errores.
          <template v-if="modelVersion">· Modelo v{{ modelVersion }}</template>
        </span>
      </p>
    </template>
  </SectionCard>
</template>
