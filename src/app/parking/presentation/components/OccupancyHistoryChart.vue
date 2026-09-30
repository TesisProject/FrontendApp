<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { HistoryBucket, HistoryRange, HistorySeries } from '../occupancy-history'

const props = defineProps<{
  series: HistorySeries
  range:  HistoryRange
}>()

// El SVG usa el ancho real del contenedor (no un viewBox fijo escalado): así el texto de los ejes
// mantiene su tamaño en móvil en vez de encogerse hasta ser ilegible.
const container = ref<HTMLElement | null>(null)
const W = ref(1080)
const H = computed(() => (W.value < 640 ? 220 : 280))
const PAD = { top: 16, right: 20, bottom: 32, left: 32 }
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

const hoverIndex = ref<number | null>(null)

const span = computed(() => Math.max(props.series.to - props.series.from, 1))

const xOf = (ts: number) => PAD.left + ((ts - props.series.from) / span.value) * plotW.value
const yOf = (v: number) => baseline.value - (v / props.series.capacity) * plotH.value

/** Marca de "ahora" cuando el eje sigue más allá (p. ej. "Hoy" muestra el día entero). */
const nowX = computed(() => (props.series.now < props.series.to ? xOf(props.series.now) : null))

/**
 * Cada intervalo se dibuja en su punto medio, sin salirse del eje: el primero puede empezar antes de
 * `from` (el backend lo alinea al reloj) y el último no puede pasar del "ahora".
 */
const coords = computed(() =>
  props.series.buckets.map(b => ({
    x: xOf(Math.min(Math.max((b.start + b.end) / 2, props.series.from), props.series.now)),
    y: yOf(b.avg),
  })),
)

/** Tramos de intervalos contiguos: un hueco (sin frames) corta la línea en vez de inventar datos. */
const segments = computed(() => {
  const { buckets } = props.series
  const out: { x: number; y: number }[][] = []
  buckets.forEach((b, i) => {
    const contiguous = i > 0 && b.start - buckets[i - 1].start <= props.series.bucketMs
    if (contiguous) out[out.length - 1].push(coords.value[i])
    else out.push([coords.value[i]])
  })
  return out
})

const fmt = (n: number) => n.toFixed(1)

const paths = computed(() =>
  segments.value.map(seg => {
    const line = seg.map((c, i) => `${i === 0 ? 'M' : 'L'}${fmt(c.x)},${fmt(c.y)}`).join(' ')
    const area = seg.length > 1
      ? `${line} L${fmt(seg[seg.length - 1].x)},${baseline.value} L${fmt(seg[0].x)},${baseline.value} Z`
      : ''
    return { line, area, lone: seg.length === 1 ? seg[0] : null }
  }),
)

/** Ticks enteros del eje Y (0 → capacidad). */
const yTicks = computed(() => {
  const cap = props.series.capacity
  const step = Math.max(1, Math.ceil(cap / 4))
  const ticks: number[] = []
  for (let v = 0; v <= cap; v += step) ticks.push(v)
  if (ticks[ticks.length - 1] !== cap) ticks.push(cap)
  return ticks.map(v => ({ value: v, y: yOf(v) }))
})

const timeFmt = new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })
const dayFmt = new Intl.DateTimeFormat('es-PE', { weekday: 'short', day: 'numeric' })

const formatTime = (ts: number) => timeFmt.format(ts)
const formatDay = (ts: number) => dayFmt.format(ts).replace('.', '')

// En pantallas angostas se rotula una marca de cada dos para que las etiquetas no se pisen.
const xTicks = computed(() => {
  const every = W.value < 480 && props.series.ticks.length > 6 ? 2 : 1
  return props.series.ticks.map((t, i) => ({
    x: xOf(t),
    label: i % every === 0 ? (props.range === '7d' ? formatDay(t) : formatTime(t)) : '',
  }))
})

function bucketLabel(b: HistoryBucket): string {
  const hours = `${formatTime(b.start)} – ${formatTime(b.end)}`
  return props.range === '7d' ? `${formatDay(b.start)} · ${hours}` : hours
}

const pct = (v: number, cap: number) => Math.round((v / Math.max(cap, 1)) * 100)

/** Titular del periodo: ocupación media y el intervalo más lleno. */
const summary = computed(() => {
  const { buckets } = props.series
  if (buckets.length === 0) return null
  const avgPct = buckets.reduce((a, b) => a + pct(b.avg, b.capacity), 0) / buckets.length
  const peak = buckets.reduce((best, b) => (b.avg > best.avg ? b : best))
  return { avgPct: Math.round(avgPct), peak }
})

const hovered = computed(() =>
  hoverIndex.value !== null
    ? { bucket: props.series.buckets[hoverIndex.value], coord: coords.value[hoverIndex.value] }
    : null,
)

/** Posición del tooltip en % del contenedor, con clamp para no salirse de la tarjeta. */
const tooltipStyle = computed(() => {
  if (!hovered.value) return {}
  const leftPct = Math.min(80, Math.max(20, (hovered.value.coord.x / W.value) * 100))
  return { left: `${leftPct}%`, top: `${(hovered.value.coord.y / H.value) * 100}%` }
})

function onMove(e: MouseEvent) {
  const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
  const svgX = ((e.clientX - rect.left) / rect.width) * W.value
  // Más lejos que un intervalo y medio del dato más cercano = estás sobre un hueco sin frames.
  const reach = Math.max((props.series.bucketMs / span.value) * plotW.value * 1.5, 8)
  let nearest: number | null = null
  let best = reach
  coords.value.forEach((c, i) => {
    const d = Math.abs(c.x - svgX)
    if (d <= best) { best = d; nearest = i }
  })
  hoverIndex.value = nearest
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <p v-if="summary" class="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
      <span>
        Ocupación media
        <strong class="font-semibold text-heading tabular-nums">{{ summary.avgPct }}%</strong>
      </span>
      <span>
        Pico
        <strong class="font-semibold text-heading tabular-nums">{{ bucketLabel(summary.peak) }}</strong>
        <span class="tabular-nums"> · {{ Math.round(summary.peak.avg) }} de {{ summary.peak.capacity }} ocupados</span>
      </span>
    </p>

    <div ref="container" class="relative w-full">
      <svg
        class="block h-auto w-full cursor-crosshair"
        :viewBox="`0 0 ${W} ${H}`"
        role="img"
        aria-label="Historial de ocupación: espacios ocupados en promedio por intervalo"
        @mousemove="onMove"
        @mouseleave="hoverIndex = null"
      >
        <!-- Grid horizontal recesivo + eje Y (ocupados, 0 → capacidad) -->
        <g v-for="t in yTicks" :key="'y' + t.value">
          <line :x1="PAD.left" :x2="W - PAD.right" :y1="t.y" :y2="t.y" stroke="var(--border)" stroke-width="1" />
          <text
            :x="PAD.left - 8" :y="t.y + 3.5"
            text-anchor="end" class="fill-muted-foreground text-[11px] tabular-nums"
          >{{ t.value }}</text>
        </g>

        <!-- Eje X: marcas de tiempo fijas del rango -->
        <g v-for="t in xTicks" :key="'x' + t.x">
          <line :x1="t.x" :x2="t.x" :y1="baseline" :y2="baseline + 4" stroke="var(--border)" stroke-width="1" />
          <text :x="t.x" :y="H - 8" text-anchor="middle" class="fill-muted-foreground text-[11px] tabular-nums">
            {{ t.label }}
          </text>
        </g>

        <g v-if="nowX !== null">
          <line
            :x1="nowX" :x2="nowX" :y1="PAD.top" :y2="baseline"
            stroke="var(--muted-foreground)" stroke-opacity="0.35" stroke-width="1"
          />
          <text
            :x="nowX > W - 60 ? nowX - 4 : nowX + 4" :y="PAD.top + 10"
            :text-anchor="nowX > W - 60 ? 'end' : 'start'"
            class="fill-muted-foreground text-[11px]"
          >ahora</text>
        </g>

        <!-- Área + línea por tramo continuo -->
        <g v-for="(p, i) in paths" :key="'s' + i">
          <path v-if="p.area" :d="p.area" fill="var(--chart-1)" fill-opacity="0.12" />
          <path
            :d="p.line" fill="none" stroke="var(--chart-1)" stroke-width="2"
            stroke-linejoin="round" stroke-linecap="round"
          />
          <!-- Un intervalo aislado no forma línea: se marca con un punto -->
          <circle v-if="p.lone" :cx="p.lone.x" :cy="p.lone.y" r="4" fill="var(--chart-1)" />
        </g>

        <!-- Crosshair + punto del intervalo bajo el cursor -->
        <template v-if="hovered">
          <line
            :x1="hovered.coord.x" :x2="hovered.coord.x" :y1="PAD.top" :y2="baseline"
            stroke="var(--muted-foreground)" stroke-opacity="0.5" stroke-width="1" stroke-dasharray="3 3"
          />
          <circle
            :cx="hovered.coord.x" :cy="hovered.coord.y" r="5"
            fill="var(--chart-1)" stroke="var(--card)" stroke-width="2"
          />
        </template>
      </svg>

      <!-- Tooltip HTML: intervalo y su ocupación -->
      <div
        v-if="hovered"
        class="pointer-events-none absolute z-[5] flex -translate-x-1/2 -translate-y-[calc(100%+12px)] flex-col gap-0.5 rounded-lg bg-navy px-[11px] py-[7px] whitespace-nowrap text-white shadow-[0_4px_14px_rgba(9,44,76,0.25)] dark:border dark:bg-popover"
        :style="tooltipStyle"
      >
        <span class="text-[11px] font-semibold text-[#bcd3ea] tabular-nums dark:text-muted-foreground">
          {{ bucketLabel(hovered.bucket) }}
        </span>
        <span class="text-xs tabular-nums">
          <span class="font-bold">{{ Math.round(hovered.bucket.avg) }} de {{ hovered.bucket.capacity }} ocupados</span>
          · {{ pct(hovered.bucket.avg, hovered.bucket.capacity) }}%
        </span>
        <span v-if="hovered.bucket.min !== hovered.bucket.max" class="text-[11px] text-[#bcd3ea] tabular-nums dark:text-muted-foreground">
          entre {{ hovered.bucket.min }} y {{ hovered.bucket.max }} en ese lapso
        </span>
      </div>
    </div>

    <!-- Vista tabular para lectores de pantalla -->
    <div class="sr-only">
      <table>
        <caption>Espacios ocupados en promedio por intervalo</caption>
        <thead><tr><th>Intervalo</th><th>Ocupados (promedio)</th><th>Mínimo</th><th>Máximo</th></tr></thead>
        <tbody>
          <tr v-for="b in series.buckets" :key="b.start">
            <td>{{ bucketLabel(b) }}</td>
            <td>{{ Math.round(b.avg) }} de {{ b.capacity }}</td>
            <td>{{ b.min }}</td>
            <td>{{ b.max }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
