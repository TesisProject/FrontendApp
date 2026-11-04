<script setup lang="ts">
import { computed } from 'vue'
import type { DemandPeaks } from '../../domain/model/demand-peaks.model'
import { demandMatrix, heatOpacity, slotAxis, slotShortLabel } from '../../domain/demand-matrix'
import { formatPct } from '../../domain/statistics-format'

/**
 * DemandHeatmap — zona × franja: cada celda es la ocupación promedio de la zona en esa hora o día,
 * más intensa cuanto más llena. Las franjas pico salen en rojo con el porcentaje en negrita y las
 * zonas con picos llevan una marca en la fila. Es una tabla real (lectores de pantalla e impresión).
 */
const props = defineProps<{ peaks: DemandPeaks }>()

const axis = computed(() => slotAxis(props.peaks.groupBy))
const rows = computed(() => demandMatrix(props.peaks))
const reasonLabel = { THRESHOLD: '≥ 80 %', PERCENTILE: 'percentil 90' } as const
</script>

<template>
  <div class="overflow-x-auto rounded-xl border bg-card shadow-[var(--pv-shadow-sm)] print:overflow-visible print:shadow-none">
    <table class="w-full border-collapse text-[11px]">
      <caption class="sr-only">Ocupación promedio por zona y franja; las franjas pico están marcadas</caption>
      <thead>
        <tr class="border-b">
          <th scope="col" class="sticky left-0 z-[1] bg-card px-3 py-2 text-left font-semibold text-muted-foreground">Zona</th>
          <th
            v-for="s in axis" :key="s" scope="col"
            class="px-0.5 py-2 text-center font-mono font-medium text-muted-foreground"
          >{{ slotShortLabel(peaks.groupBy, s) }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.zoneId" class="border-b last:border-0">
          <th
            scope="row"
            class="sticky left-0 z-[1] max-w-48 truncate bg-card px-3 py-1.5 text-left text-xs font-medium"
            :class="r.peakZone ? 'text-destructive' : 'text-heading'"
          >
            <span v-if="r.peakZone" aria-hidden="true" class="mr-1 inline-block size-2 rounded-full bg-destructive" />
            {{ r.zoneName }}
            <span v-if="r.peakZone" class="sr-only">(zona con picos)</span>
          </th>
          <td v-for="(c, i) in r.cells" :key="axis[i]" class="p-0.5">
            <div
              v-if="c"
              class="heat-cell flex h-8 min-w-9 items-center justify-center rounded-[3px] tabular-nums"
              :class="c.peak ? 'bg-destructive font-bold text-white ring-2 ring-destructive/40' : 'text-heading'"
              :style="c.peak ? undefined : { background: `color-mix(in srgb, var(--chart-1) ${Math.round(heatOpacity(c.avgPct) * 100)}%, transparent)`, color: c.avgPct >= 55 ? 'white' : undefined }"
              :title="`${r.zoneName} · ${c.label}: ${formatPct(c.avgPct)} promedio, máx. ${formatPct(c.maxPct)}${c.peakReason ? ` · pico (${reasonLabel[c.peakReason]})` : ''}`"
            >
              {{ Math.round(c.avgPct) }}
              <span v-if="c.peak" class="sr-only">% pico</span>
            </div>
            <div v-else class="flex h-8 min-w-9 items-center justify-center text-muted-foreground/50" title="Sin datos">·</div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.heat-cell {
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}
</style>
