<script lang="ts">
/** Rangos de disponibilidad predicha y el color con que se pinta su barra (de mayor a menor). */
export const AVAILABILITY_BANDS = [
  { min: 70, color: '#38a169', label: 'Alta', range: '≥70 %' },
  { min: 30, color: '#f2894a', label: 'Media', range: '30–69 %' },
  { min: 0, color: '#e53e3e', label: 'Baja', range: '<30 %' },
] as const

/** Color de la barra para un % de disponibilidad predicha. */
export function barColor(pct: number): string {
  return (AVAILABILITY_BANDS.find(b => pct >= b.min) ?? AVAILABILITY_BANDS[AVAILABILITY_BANDS.length - 1]).color
}
</script>

<script setup lang="ts">
import { Check, X } from '@lucide/vue'

defineProps<{
  /** Margen (puntos %) dentro del cual una predicción cuenta como acierto. */
  tolerance: number
  /** Se muestran la marca de lo real y el ✓/✗ (solo cuando hay con qué comparar). */
  showComparison: boolean
}>()
</script>

<template>
  <ul
    class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-caption text-muted-foreground"
    aria-label="Leyenda de la tabla de predicciones"
  >
    <li class="font-semibold text-heading">Disponibilidad predicha:</li>
    <li v-for="band in AVAILABILITY_BANDS" :key="band.min" class="inline-flex items-center gap-1.5">
      <span class="h-2 w-4 rounded-full" :style="{ background: band.color }" aria-hidden="true" />
      {{ band.label }} <span class="tabular-nums opacity-80">({{ band.range }})</span>
    </li>
    <template v-if="showComparison">
      <li class="inline-flex items-center gap-1.5">
        <span class="relative h-2 w-4 rounded-full bg-muted" aria-hidden="true">
          <span class="absolute -top-[3px] left-1/2 h-[14px] w-[3px] -translate-x-1/2 rounded-full bg-heading ring-2 ring-card" />
        </span>
        Real medido por las cámaras
      </li>
      <li class="inline-flex items-center gap-1.5">
        <span class="inline-flex size-[16px] items-center justify-center rounded-full bg-success-soft text-success" aria-hidden="true">
          <Check class="size-2.5" :stroke-width="3.5" />
        </span>
        <span class="inline-flex size-[16px] items-center justify-center rounded-full bg-destructive-soft text-destructive" aria-hidden="true">
          <X class="size-2.5" :stroke-width="3.5" />
        </span>
        Acertó / falló <span class="tabular-nums opacity-80">(margen ±{{ tolerance }} pts)</span>
      </li>
    </template>
  </ul>
</template>
