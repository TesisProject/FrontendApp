<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

/** Una franja del día: % de disponibilidad predicho y, si ya se midió, el real. */
export interface ForecastChartPoint {
  /** Minuto del día en que empieza la franja. */
  start: number
  predicted: number
  actual: number | null
}

const props = defineProps<{
  points: ForecastChartPoint[]
  /** Duración de cada franja en minutos (la misma que usa la tabla). */
  bucketMinutes: number
  /** Minuto actual del día si se está viendo hoy; `null` en otro día. */
  nowMinute: number | null
  /** Aviso cuando no hay curva real que comparar (sin histórico o sin lecturas). */
  notice?: string | null
}>()

// Igual que OccupancyHistoryChart: el SVG usa el ancho real del contenedor para que el texto de los ejes
// no se encoja en móvil.
const container = ref<HTMLElement | null>(null)
const W = ref(720)
const H = computed(() => (W.value < 640 ? 150 : 170))
const PAD = { top: 14, right: 14, bottom: 26, left: 36 }
const plotW = computed(() => W.value - PAD.left - PAD.right)
const plotH = computed(() => H.value - PAD.top - PAD.bottom)
const baseline = computed(() => PAD.top + plotH.value)

let resizeObserver: ResizeObserver | undefined
onMounted(() => {
  if (!container.value) return
  resizeObserver = new ResizeObserver(([entry]) => {
    W.value = Math.max(280, Math.round(entry.contentRect.width))
  })
  resizeObserver.observe(container.value)
})
onBeforeUnmount(() => resizeObserver?.disconnect())

/** Eje X: del inicio de la primera franja al final de la última. */
const domain = computed(() => {
  const starts = props.points.map(p => p.start)
  const from = Math.min(...starts)
  const to = Math.max(...starts) + props.bucketMinutes
  return { from, to, span: Math.max(to - from, 1) }
})

const xOf = (minute: number) => PAD.left + ((minute - domain.value.from) / domain.value.span) * plotW.value
const yOf = (pct: number) => baseline.value - (Math.min(100, Math.max(0, pct)) / 100) * plotH.value
const fmt = (n: number) => n.toFixed(1)

/** Cada franja se dibuja en su punto medio. */
const midX = (start: number) => xOf(start + props.bucketMinutes / 2)

/** Tramos contiguos de una serie: una franja sin dato corta la línea en vez de inventarla. */
function segmentsOf(values: (number | null)[]): { x: number; y: number }[][] {
  const out: { x: number; y: number }[][] = []
  let prevStart: number | null = null
  props.points.forEach((p, i) => {
    const v = values[i]
    if (v === null) { prevStart = null; return }
    const point = { x: midX(p.start), y: yOf(v) }
    if (prevStart !== null && p.start - prevStart <= props.bucketMinutes) out[out.length - 1].push(point)
    else out.push([point])
    prevStart = p.start
  })
  return out
}

const toPath = (seg: { x: number; y: number }[]) =>
  seg.map((c, i) => `${i === 0 ? 'M' : 'L'}${fmt(c.x)},${fmt(c.y)}`).join(' ')

const predictedPaths = computed(() =>
  segmentsOf(props.points.map(p => p.predicted)).map(seg => ({
    line: toPath(seg),
    area: seg.length > 1
      ? `${toPath(seg)} L${fmt(seg[seg.length - 1].x)},${baseline.value} L${fmt(seg[0].x)},${baseline.value} Z`
      : '',
    lone: seg.length === 1 ? seg[0] : null,
  })),
)

const hasActual = computed(() => props.points.some(p => p.actual !== null))

const actualPaths = computed(() =>
  segmentsOf(props.points.map(p => p.actual)).map(seg => ({ line: toPath(seg), lone: seg.length === 1 ? seg[0] : null })),
)

const yTicks = computed(() => [0, 25, 50, 75, 100].map(v => ({ value: v, y: yOf(v) })))

/** "08:30" para el minuto 510 del día. */
function formatMinute(minuteOfDay: number): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const m = Math.min(minuteOfDay, 24 * 60)
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
}

/** Marcas del eje X en horas enteras, más espaciadas si el gráfico es angosto. */
const xTicks = computed(() => {
  const { from, to, span } = domain.value
  const hours = span / 60
  const maxTicks = W.value < 480 ? 4 : 8
  const stepH = [1, 2, 3, 4, 6].find(s => hours / s <= maxTicks) ?? 6
  const ticks: { x: number; label: string }[] = []
  for (let m = Math.ceil(from / (stepH * 60)) * stepH * 60; m <= to; m += stepH * 60) {
    ticks.push({ x: xOf(m), label: formatMinute(m) })
  }
  return ticks
})

const nowX = computed(() => {
  const n = props.nowMinute
  return n !== null && n >= domain.value.from && n <= domain.value.to ? xOf(n) : null
})

const rangeLabel = (start: number) => `${formatMinute(start)} – ${formatMinute(start + props.bucketMinutes)}`

const hoverIndex = ref<number | null>(null)
const hovered = computed(() => {
  if (hoverIndex.value === null) return null
  const p = props.points[hoverIndex.value]
  return p ? { point: p, x: midX(p.start), y: yOf(p.actual ?? p.predicted) } : null
})

const tooltipStyle = computed(() => {
  if (!hovered.value) return {}
  const leftPct = Math.min(80, Math.max(20, (hovered.value.x / W.value) * 100))
  return { left: `${leftPct}%`, top: `${(Math.min(yOf(hovered.value.point.predicted), hovered.value.y) / H.value) * 100}%` }
})

function onMove(e: MouseEvent) {
  const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
  const svgX = ((e.clientX - rect.left) / rect.width) * W.value
  let nearest: number | null = null
  let best = Infinity
  props.points.forEach((p, i) => {
    const d = Math.abs(midX(p.start) - svgX)
    if (d < best) { best = d; nearest = i }
  })
  hoverIndex.value = nearest
}

const ariaLabel = computed(() =>
  hasActual.value
    ? 'Gráfico de disponibilidad del día: curva predicha frente a la disponibilidad real por franja'
    : 'Gráfico de disponibilidad predicha del día por franja',
)
</script>

<template>
  <figure class="flex flex-col gap-1.5">
    <figcaption class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-muted-foreground">
      <span class="inline-flex items-center gap-1.5">
        <svg width="18" height="8" aria-hidden="true"><line x1="0" x2="18" y1="4" y2="4" stroke="var(--chart-1)" stroke-width="2" stroke-dasharray="5 3" /></svg>
        Predicción
      </span>
      <span v-if="hasActual" class="inline-flex items-center gap-1.5">
        <svg width="18" height="8" aria-hidden="true">
          <line x1="0" x2="18" y1="4" y2="4" stroke="var(--heading)" stroke-width="2" />
          <circle cx="9" cy="4" r="2.5" fill="var(--heading)" />
        </svg>
        Real (cámaras)
      </span>
      <span v-if="nowX !== null" class="inline-flex items-center gap-1.5">
        <svg width="8" height="10" aria-hidden="true"><line x1="4" x2="4" y1="0" y2="10" stroke="var(--muted-foreground)" stroke-width="1.5" /></svg>
        Ahora
      </span>
      <span class="ml-auto opacity-80">% de espacios disponibles</span>
    </figcaption>

    <div ref="container" class="relative w-full">
      <svg
        class="block h-auto w-full cursor-crosshair"
        :viewBox="`0 0 ${W} ${H}`"
        role="img"
        :aria-label="ariaLabel"
        @mousemove="onMove"
        @mouseleave="hoverIndex = null"
      >
        <g v-for="t in yTicks" :key="'y' + t.value">
          <line :x1="PAD.left" :x2="W - PAD.right" :y1="t.y" :y2="t.y" stroke="var(--border)" stroke-width="1" />
          <text :x="PAD.left - 6" :y="t.y + 3.5" text-anchor="end" class="fill-muted-foreground text-[10.5px] tabular-nums">
            {{ t.value }}%
          </text>
        </g>

        <g v-for="t in xTicks" :key="'x' + t.x">
          <line :x1="t.x" :x2="t.x" :y1="baseline" :y2="baseline + 4" stroke="var(--border)" stroke-width="1" />
          <text :x="t.x" :y="H - 7" text-anchor="middle" class="fill-muted-foreground text-[10.5px] tabular-nums">{{ t.label }}</text>
        </g>

        <g v-if="nowX !== null">
          <line :x1="nowX" :x2="nowX" :y1="PAD.top" :y2="baseline" stroke="var(--muted-foreground)" stroke-opacity="0.55" stroke-width="1.5" />
          <text
            :x="nowX > W - 60 ? nowX - 4 : nowX + 4" :y="PAD.top + 9"
            :text-anchor="nowX > W - 60 ? 'end' : 'start'"
            class="fill-muted-foreground text-[10.5px]"
          >ahora</text>
        </g>

        <!-- Predicción: área suave + línea discontinua -->
        <g v-for="(p, i) in predictedPaths" :key="'p' + i">
          <path v-if="p.area" :d="p.area" fill="var(--chart-1)" fill-opacity="0.08" />
          <path :d="p.line" fill="none" stroke="var(--chart-1)" stroke-width="2" stroke-dasharray="5 3" stroke-linejoin="round" stroke-linecap="round" />
          <circle v-if="p.lone" :cx="p.lone.x" :cy="p.lone.y" r="3" fill="var(--chart-1)" />
        </g>

        <!-- Real: línea continua con puntos en cada franja medida -->
        <g v-for="(p, i) in actualPaths" :key="'a' + i">
          <path :d="p.line" fill="none" stroke="var(--heading)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
          <circle v-if="p.lone" :cx="p.lone.x" :cy="p.lone.y" r="3" fill="var(--heading)" />
        </g>

        <template v-if="hovered">
          <line
            :x1="hovered.x" :x2="hovered.x" :y1="PAD.top" :y2="baseline"
            stroke="var(--muted-foreground)" stroke-opacity="0.5" stroke-width="1" stroke-dasharray="3 3"
          />
          <circle :cx="hovered.x" :cy="yOf(hovered.point.predicted)" r="4" fill="var(--chart-1)" stroke="var(--card)" stroke-width="2" />
          <circle
            v-if="hovered.point.actual !== null"
            :cx="hovered.x" :cy="yOf(hovered.point.actual)" r="4" fill="var(--heading)" stroke="var(--card)" stroke-width="2"
          />
        </template>
      </svg>

      <div
        v-if="hovered"
        class="pointer-events-none absolute z-[5] flex -translate-x-1/2 -translate-y-[calc(100%+12px)] flex-col gap-0.5 rounded-lg bg-navy px-[11px] py-[7px] whitespace-nowrap text-white shadow-[0_4px_14px_rgba(9,44,76,0.25)] dark:border dark:bg-popover"
        :style="tooltipStyle"
      >
        <span class="text-[11px] font-semibold text-[#bcd3ea] tabular-nums dark:text-muted-foreground">
          {{ rangeLabel(hovered.point.start) }}
        </span>
        <span class="text-xs tabular-nums">
          Predicción: <span class="font-bold">{{ hovered.point.predicted }} %</span>
          <template v-if="hovered.point.actual !== null"> · Real: <span class="font-bold">{{ hovered.point.actual }} %</span></template>
        </span>
      </div>
    </div>

    <p v-if="notice" class="text-[11.5px] leading-snug text-muted-foreground" role="note">{{ notice }}</p>

    <!-- Vista tabular para lectores de pantalla -->
    <div class="sr-only">
      <table>
        <caption>Disponibilidad predicha y real por franja</caption>
        <thead><tr><th>Franja</th><th>Predicción</th><th>Real</th></tr></thead>
        <tbody>
          <tr v-for="p in points" :key="p.start">
            <td>{{ rangeLabel(p.start) }}</td>
            <td>{{ p.predicted }} %</td>
            <td>{{ p.actual !== null ? `${p.actual} %` : 'Sin lectura' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </figure>
</template>
