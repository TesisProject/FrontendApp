<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ZoneOccupancyHistoryPointResponse } from '../../infrastructure/availability-response'

const props = defineProps<{
  points: ZoneOccupancyHistoryPointResponse[]
}>()

// Geometría lógica del SVG (escala con el ancho de la tarjeta vía viewBox).
const W = 1080
const H = 300
const PAD = { top: 18, right: 22, bottom: 34, left: 44 }
const plotW = W - PAD.left - PAD.right
const plotH = H - PAD.top - PAD.bottom

const hoverIndex = ref<number | null>(null)

const times = computed(() => props.points.map(p => new Date(p.occurredAt).getTime()))

const yMax = computed(() => {
  const capacity = Math.max(...props.points.map(p => p.totalSpots), 1)
  return capacity
})

/** Coordenadas SVG de cada frame (eje X con escala de tiempo real, no por índice). */
const coords = computed(() => {
  const ts = times.value
  const t0 = ts[0]
  const span = Math.max(ts[ts.length - 1] - t0, 1)
  return props.points.map((p, i) => ({
    x: props.points.length === 1
      ? PAD.left + plotW / 2
      : PAD.left + ((ts[i] - t0) / span) * plotW,
    y: PAD.top + plotH - (p.occupiedSpots / yMax.value) * plotH,
  }))
})

const linePath = computed(() =>
  coords.value.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' '),
)

const areaPath = computed(() => {
  const c = coords.value
  if (c.length < 2) return ''
  const baseline = PAD.top + plotH
  return `${linePath.value} L${c[c.length - 1].x.toFixed(1)},${baseline} L${c[0].x.toFixed(1)},${baseline} Z`
})

/** Ticks enteros del eje Y (0 → capacidad). */
const yTicks = computed(() => {
  const step = Math.max(1, Math.ceil(yMax.value / 4))
  const ticks: number[] = []
  for (let v = 0; v <= yMax.value; v += step) ticks.push(v)
  if (ticks[ticks.length - 1] !== yMax.value) ticks.push(yMax.value)
  return ticks.map(v => ({ value: v, y: PAD.top + plotH - (v / yMax.value) * plotH }))
})

const spansDays = computed(() => {
  const ts = times.value
  return ts.length > 1 && ts[ts.length - 1] - ts[0] > 24 * 3600 * 1000
})

function formatTime(iso: string, withDate = spansDays.value): string {
  const d = new Date(iso)
  const time = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
  if (!withDate) return time
  return `${d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' })} ${time}`
}

/** Hasta 4 etiquetas de tiempo repartidas, sin duplicados ni cortes en los bordes. */
const xLabels = computed(() => {
  const n = props.points.length
  if (n === 0) return []
  const count = Math.min(4, n)
  const idxs = count === 1 ? [0] : Array.from({ length: count }, (_, i) => Math.round((i * (n - 1)) / (count - 1)))
  const seen = new Set<string>()
  return [...new Set(idxs)].flatMap(i => {
    const label = formatTime(props.points[i].occurredAt)
    if (seen.has(label)) return []
    seen.add(label)
    return [{
      x: coords.value[i].x,
      label,
      anchor: i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle',
    }]
  })
})

const hovered = computed(() =>
  hoverIndex.value !== null
    ? { point: props.points[hoverIndex.value], coord: coords.value[hoverIndex.value] }
    : null,
)

/** Posición del tooltip en % del contenedor, con clamp para no salirse de la tarjeta. */
const tooltipStyle = computed(() => {
  if (!hovered.value) return {}
  const raw = (hovered.value.coord.x / W) * 100
  const leftPct = Math.min(78, Math.max(12, raw))
  const topPct = (hovered.value.coord.y / H) * 100
  return { left: `${leftPct}%`, top: `${topPct}%` }
})

function onMove(e: MouseEvent) {
  const svg = e.currentTarget as SVGSVGElement
  const rect = svg.getBoundingClientRect()
  const svgX = ((e.clientX - rect.left) / rect.width) * W
  let nearest = 0
  let best = Infinity
  coords.value.forEach((c, i) => {
    const d = Math.abs(c.x - svgX)
    if (d < best) { best = d; nearest = i }
  })
  hoverIndex.value = nearest
}

function onLeave() {
  hoverIndex.value = null
}
</script>

<template>
  <div class="chart-wrap">
    <svg
      class="chart"
      :viewBox="`0 0 ${W} ${H}`"
      role="img"
      aria-label="Historial de ocupación: espacios ocupados a lo largo del tiempo"
      @mousemove="onMove"
      @mouseleave="onLeave"
    >
      <!-- Grid horizontal recesivo -->
      <g>
        <line
          v-for="t in yTicks"
          :key="'g' + t.value"
          :x1="PAD.left" :x2="W - PAD.right"
          :y1="t.y" :y2="t.y"
          stroke="#e8ecf0" stroke-width="1"
        />
      </g>

      <!-- Eje Y: ocupados (0 → capacidad) -->
      <g>
        <text
          v-for="t in yTicks"
          :key="'y' + t.value"
          :x="PAD.left - 8" :y="t.y + 3.5"
          text-anchor="end" class="tick-label"
        >{{ t.value }}</text>
      </g>

      <!-- Eje X: horas de los frames -->
      <g>
        <text
          v-for="(l, i) in xLabels"
          :key="'x' + i"
          :x="l.x" :y="H - 8"
          :text-anchor="l.anchor" class="tick-label"
        >{{ l.label }}</text>
      </g>

      <!-- Área + línea -->
      <path v-if="areaPath" :d="areaPath" fill="rgba(26, 86, 196, 0.10)" />
      <path v-if="coords.length > 1" :d="linePath" fill="none" stroke="#1a56c4" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />

      <!-- Crosshair -->
      <line
        v-if="hovered"
        :x1="hovered.coord.x" :x2="hovered.coord.x"
        :y1="PAD.top" :y2="PAD.top + plotH"
        stroke="#cbd5e1" stroke-width="1" stroke-dasharray="3 3"
      />

      <!-- Un punto por frame (anillo blanco de 2px sobre el relleno) -->
      <circle
        v-for="(c, i) in coords"
        :key="'p' + i"
        :cx="c.x" :cy="c.y"
        :r="hoverIndex === i ? 5.5 : 3.5"
        fill="#1a56c4" stroke="white" stroke-width="2"
      />
    </svg>

    <!-- Tooltip HTML: cuándo se tomó el frame y qué ocupación tenía -->
    <div v-if="hovered" class="tooltip" :style="tooltipStyle">
      <span class="tooltip-time">{{ formatTime(hovered.point.occurredAt, true) }}</span>
      <span class="tooltip-data">
        <span class="occ">{{ hovered.point.occupiedSpots }} ocupados</span>
        · {{ hovered.point.freeSpots }} libres de {{ hovered.point.totalSpots }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.chart-wrap {
  position: relative;
  width: 100%;
}

.chart {
  display: block;
  width: 100%;
  height: auto;
  cursor: crosshair;
}

.tick-label {
  font-size: 11px;
  fill: #8a94a0;
  font-variant-numeric: tabular-nums;
}

.tooltip {
  position: absolute;
  transform: translate(-50%, calc(-100% - 12px));
  background: #092c4c;
  color: white;
  border-radius: 8px;
  padding: 7px 11px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  pointer-events: none;
  white-space: nowrap;
  box-shadow: 0 4px 14px rgba(9, 44, 76, 0.25);
  z-index: 5;
}

.tooltip-time {
  font-size: 11px;
  font-weight: 600;
  color: #bcd3ea;
  font-variant-numeric: tabular-nums;
}

.tooltip-data {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.tooltip-data .occ {
  font-weight: 700;
}
</style>
