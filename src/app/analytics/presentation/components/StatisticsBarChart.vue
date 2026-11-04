<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { StatisticsPoint, ZoneStatistics } from '../../domain/model/zone-statistics.model'
import { bucketAxisLabel, bucketLongLabel, formatPct } from '../../domain/statistics-format'

/**
 * StatisticsBarChart — barras de ocupación promedio por intervalo (día, semana o mes) con una marca
 * del máximo observado. SVG propio, mismo patrón que `OccupancyHistoryChart`: ancho real del
 * contenedor para que el texto de los ejes no se encoja en móvil. Un intervalo sin datos queda como
 * hueco con una raya punteada, no como 0 %.
 */
const props = defineProps<{ statistics: ZoneStatistics }>()

const container = ref<HTMLElement | null>(null)
const W = ref(900)
const H = computed(() => (W.value < 640 ? 230 : 280))
const PAD = { top: 18, right: 16, bottom: 34, left: 40 }
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

const yOf = (pct: number) => baseline.value - (Math.min(Math.max(pct, 0), 100) / 100) * plotH.value
const yTicks = [0, 20, 40, 60, 80, 100]

const slotW = computed(() => plotW.value / Math.max(props.statistics.points.length, 1))
const barW = computed(() => Math.max(4, Math.min(48, slotW.value * 0.62)))

const bars = computed(() =>
  props.statistics.points.map((p, i) => {
    const cx = PAD.left + slotW.value * (i + 0.5)
    return {
      point: p,
      cx,
      x:    cx - barW.value / 2,
      y:    p.avgPct === null ? baseline.value : yOf(p.avgPct),
      h:    p.avgPct === null ? 0 : baseline.value - yOf(p.avgPct),
      maxY: p.maxPct === null ? null : yOf(p.maxPct),
    }
  }),
)

// Con muchas barras en pantallas angostas se rotula una de cada dos.
const labelEvery = computed(() => (slotW.value < 34 ? 2 : 1))

const hoverIndex = ref<number | null>(null)
const hovered = computed(() => (hoverIndex.value === null ? null : bars.value[hoverIndex.value]))

const tooltipStyle = computed(() => {
  if (!hovered.value) return {}
  const leftPct = Math.min(82, Math.max(18, (hovered.value.cx / W.value) * 100))
  return { left: `${leftPct}%`, top: `${(Math.min(hovered.value.y, hovered.value.maxY ?? hovered.value.y) / H.value) * 100}%` }
})

function label(p: StatisticsPoint) {
  return bucketLongLabel(p.start, props.statistics.granularity)
}
</script>

<template>
  <div ref="container" class="relative w-full">
    <svg
      class="block h-auto w-full"
      :viewBox="`0 0 ${W} ${H}`"
      role="img"
      :aria-label="`Ocupación promedio y máxima de ${statistics.zoneName} por intervalo`"
      @mouseleave="hoverIndex = null"
    >
      <g v-for="t in yTicks" :key="'y' + t">
        <line
          :x1="PAD.left" :x2="W - PAD.right" :y1="yOf(t)" :y2="yOf(t)"
          :stroke="t === 80 ? 'var(--zone-ocupado)' : 'var(--border)'"
          :stroke-dasharray="t === 80 ? '4 4' : undefined"
          :stroke-opacity="t === 80 ? 0.6 : 1"
          stroke-width="1"
        />
        <text :x="PAD.left - 8" :y="yOf(t) + 3.5" text-anchor="end" class="fill-muted-foreground text-[11px] tabular-nums">
          {{ t }}%
        </text>
      </g>

      <g v-for="(b, i) in bars" :key="b.point.start" @mouseenter="hoverIndex = i">
        <!-- Zona sensible a todo el alto del intervalo, para que el tooltip salga también en barras bajas -->
        <rect :x="b.cx - slotW / 2" :y="PAD.top" :width="slotW" :height="plotH" fill="transparent" />
        <template v-if="b.point.samples > 0">
          <rect
            :x="b.x" :y="b.y" :width="barW" :height="Math.max(b.h, 1)" rx="3"
            fill="var(--chart-1)" :fill-opacity="hoverIndex === i ? 1 : 0.82"
          />
          <line
            v-if="b.maxY !== null"
            :x1="b.x - 3" :x2="b.x + barW + 3" :y1="b.maxY" :y2="b.maxY"
            stroke="var(--zone-ocupado)" stroke-width="2" stroke-linecap="round"
          />
        </template>
        <line
          v-else
          :x1="b.x" :x2="b.x + barW" :y1="baseline - 1" :y2="baseline - 1"
          stroke="var(--muted-foreground)" stroke-opacity="0.5" stroke-dasharray="2 3" stroke-width="2"
        />
        <text
          v-if="i % labelEvery === 0"
          :x="b.cx" :y="H - 10" text-anchor="middle" class="fill-muted-foreground text-[11px] tabular-nums"
        >{{ bucketAxisLabel(b.point.start, statistics.granularity) }}</text>
      </g>
    </svg>

    <div
      v-if="hovered"
      class="pointer-events-none absolute z-[5] flex -translate-x-1/2 -translate-y-[calc(100%+10px)] flex-col gap-0.5 rounded-lg bg-navy px-[11px] py-[7px] whitespace-nowrap text-white shadow-[0_4px_14px_rgba(9,44,76,0.25)] dark:border dark:bg-popover"
      :style="tooltipStyle"
    >
      <span class="text-[11px] font-semibold text-[#bcd3ea] dark:text-muted-foreground">{{ label(hovered.point) }}</span>
      <template v-if="hovered.point.samples > 0">
        <span class="text-xs tabular-nums"><span class="font-bold">Promedio {{ formatPct(hovered.point.avgPct) }}</span> · máx. {{ formatPct(hovered.point.maxPct) }}</span>
        <span class="text-[11px] text-[#bcd3ea] tabular-nums dark:text-muted-foreground">
          {{ hovered.point.avgOccupied?.toLocaleString('es-PE') }} de {{ hovered.point.totalSpots }} ocupados en promedio
        </span>
      </template>
      <span v-else class="text-xs">Sin datos en este intervalo</span>
    </div>

    <div class="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
      <span class="inline-flex items-center gap-1.5"><span class="size-2.5 rounded-[2px] bg-chart-1" /> Ocupación promedio</span>
      <span class="inline-flex items-center gap-1.5"><span class="h-0.5 w-3 rounded bg-zone-ocupado" /> Máximo observado</span>
      <span class="inline-flex items-center gap-1.5"><span class="h-0 w-3 border-t border-dashed border-zone-ocupado" /> Umbral de ocupado (80 %)</span>
    </div>
  </div>
</template>
