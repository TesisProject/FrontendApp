<script setup lang="ts">
import { computed } from 'vue'
import { usePredictionStore } from '../../application/prediction.store'

const store = usePredictionStore()

const zoneName = computed(
  () => store.zones.find(z => z.id === store.selectedZoneId)?.name ?? 'Zona',
)

const DAY_LABEL: Record<string, string> = {
  MONDAY: 'Lun', TUESDAY: 'Mar', WEDNESDAY: 'Mié', THURSDAY: 'Jue',
  FRIDAY: 'Vie', SATURDAY: 'Sáb', SUNDAY: 'Dom',
}

function formatWindow(startMinute: number, windowSize: number): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  const end = startMinute + windowSize
  return `${pad(Math.floor(startMinute / 60))}:${pad(startMinute % 60)} – ${pad(Math.floor(end / 60))}:${pad(end % 60)}`
}

const windowLabel = computed(() => {
  const c = store.comparison
  if (!c) return ''
  return `${DAY_LABEL[c.dayOfWeek] ?? c.dayOfWeek} ${formatWindow(c.startMinuteOfDay, c.windowSizeMinutes)}`
})

// Escala común para las barras: el total de cupos de la zona.
const maxSpots = computed(() => {
  const c = store.comparison
  if (!c) return 1
  return Math.max(c.predicted.totalSpots, c.actual?.totalSpots ?? 0, 1)
})

function widthPct(value: number): number {
  return Math.round((value / maxSpots.value) * 100)
}

// Tarjeta de delta: magnitud del desacierto en cupos disponibles.
const deltaAbs = computed(() => Math.abs(store.comparison?.delta?.availableDiff ?? 0))

const accuracyColor = computed(() => {
  const total = maxSpots.value
  const ratio = deltaAbs.value / total
  if (ratio <= 0.1) return '#38a169'   // verde: muy acertada
  if (ratio <= 0.25) return '#f2894a'  // ámbar: moderada
  return '#e53e3e'                      // rojo: desviada
})

const accuracyLabel = computed(() => {
  const ratio = deltaAbs.value / maxSpots.value
  if (ratio <= 0.1) return 'Muy acertada'
  if (ratio <= 0.25) return 'Aproximada'
  return 'Desviada'
})

const deltaDescription = computed(() => {
  const diff = store.comparison?.delta?.availableDiff ?? 0
  if (diff === 0) return 'La IA acertó exactamente la disponibilidad.'
  if (diff > 0) return `La IA predijo ${diff} cupo${diff === 1 ? '' : 's'} disponible${diff === 1 ? '' : 's'} de más (optimista).`
  return `La IA predijo ${-diff} cupo${-diff === -1 ? '' : 's'} disponible${diff === -1 ? '' : 's'} de menos (pesimista).`
})

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.round(diffMs / 60000)
  if (min < 1) return 'hace instantes'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  return `hace ${h} h`
}
</script>

<template>
  <div class="cmp-card">
    <!-- Header -->
    <div class="cmp-header">
      <div>
        <span class="cmp-title">Predicción IA vs cámaras</span>
        <span class="cmp-sub">{{ zoneName }}<template v-if="windowLabel"> · {{ windowLabel }}</template></span>
      </div>
      <div class="cmp-legend" v-if="store.comparison">
        <span><span class="dot" style="background:#3182ce" /> Predicho</span>
        <span><span class="dot" style="background:#7c5cff" /> Real</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="store.comparisonLoading" class="cmp-state">
      <div class="spinner" /><span>Cargando comparación…</span>
    </div>

    <!-- Unavailable (404 o error) -->
    <div v-else-if="store.comparisonUnavailable" class="cmp-state">
      <span class="muted">{{ store.comparisonUnavailable }}</span>
    </div>

    <template v-else-if="store.comparison">
      <!-- Barras agrupadas -->
      <div class="groups">
        <!-- Disponibles -->
        <div class="group">
          <div class="group-head">
            <span class="group-name">Disponibles</span>
          </div>
          <div class="bar-row">
            <span class="bar-tag">Pred</span>
            <div class="track"><div class="fill pred" :style="{ width: widthPct(store.comparison.predicted.availableSpots) + '%' }" /></div>
            <span class="bar-val">{{ store.comparison.predicted.availableSpots }}</span>
          </div>
          <div class="bar-row" v-if="store.comparison.actual">
            <span class="bar-tag">Real</span>
            <div class="track"><div class="fill real" :style="{ width: widthPct(store.comparison.actual.availableSpots) + '%' }" /></div>
            <span class="bar-val">{{ store.comparison.actual.availableSpots }}</span>
          </div>
        </div>

        <!-- Ocupados -->
        <div class="group">
          <div class="group-head">
            <span class="group-name">Ocupados</span>
          </div>
          <div class="bar-row">
            <span class="bar-tag">Pred</span>
            <div class="track"><div class="fill pred" :style="{ width: widthPct(store.comparison.predicted.occupiedSpots) + '%' }" /></div>
            <span class="bar-val">{{ store.comparison.predicted.occupiedSpots }}</span>
          </div>
          <div class="bar-row" v-if="store.comparison.actual">
            <span class="bar-tag">Real</span>
            <div class="track"><div class="fill real" :style="{ width: widthPct(store.comparison.actual.occupiedSpots) + '%' }" /></div>
            <span class="bar-val">{{ store.comparison.actual.occupiedSpots }}</span>
          </div>
        </div>
      </div>

      <!-- Tarjeta de delta (acierto de la IA) -->
      <div v-if="store.comparison.actual && store.comparison.delta" class="delta-card" :style="{ borderColor: accuracyColor + '55' }">
        <div class="delta-main">
          <span class="delta-badge" :style="{ background: accuracyColor + '1f', color: accuracyColor }">
            {{ accuracyLabel }}
          </span>
          <span class="delta-figure" :style="{ color: accuracyColor }">
            ±{{ deltaAbs }} cupo{{ deltaAbs === 1 ? '' : 's' }}
          </span>
        </div>
        <span class="delta-desc">{{ deltaDescription }}</span>
        <span class="delta-foot">
          Lectura de cámaras {{ timeAgo(store.comparison.actual.occurredAt) }} ·
          modelo v{{ store.comparison.predicted.modelVersion }}
        </span>
      </div>

      <!-- Sin lectura real todavía -->
      <div v-else class="delta-card waiting">
        <span class="delta-desc">
          Predicción disponible, pero aún no hay lectura de cámaras para esta ventana.
          Mostrando solo el lado predicho (v{{ store.comparison.predicted.modelVersion }}).
        </span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.cmp-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 24px;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.cmp-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.cmp-title {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-title);
}

.cmp-sub {
  display: block;
  font-size: 12px;
  color: var(--color-muted);
  margin-top: 2px;
}

.cmp-legend {
  display: flex;
  gap: 14px;
  font-size: 11px;
  color: var(--color-muted);
}

.cmp-legend span { display: inline-flex; align-items: center; }

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 5px;
}

.cmp-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 28px 0;
  font-size: 13px;
  color: var(--color-faint);
}

.cmp-state .muted { color: var(--color-faint); text-align: center; }

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-title);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.groups {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.group { display: flex; flex-direction: column; gap: 10px; }

.group-head { display: flex; align-items: center; justify-content: space-between; }

.group-name {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: var(--color-muted);
}

.bar-row { display: flex; align-items: center; gap: 8px; }

.bar-tag {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-faint);
  width: 30px;
  flex-shrink: 0;
}

.track {
  flex: 1;
  height: 16px;
  background: var(--color-border-soft);
  border-radius: 6px;
  overflow: hidden;
}

.fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.5s ease;
  min-width: 2px;
}

.fill.pred { background: #3182ce; }
.fill.real { background: #7c5cff; }

.bar-val {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-title);
  width: 26px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.delta-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: 1.5px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  background: var(--color-border-soft);
}

.delta-card.waiting { border-style: dashed; }

.delta-main { display: flex; align-items: center; gap: 12px; }

.delta-badge {
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
}

.delta-figure {
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.delta-desc { font-size: 13px; color: var(--color-sub); line-height: 1.5; }

.delta-foot { font-size: 11px; color: var(--color-faint); }

@media (max-width: 560px) {
  .groups { grid-template-columns: 1fr; gap: 18px; }
}
</style>
