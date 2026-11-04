<script setup lang="ts">
import {
  CLASSIFICATIONS, CLASSIFICATION_RANGE, classificationColor, classificationLabel,
} from '../../domain/zone-classification'

/** MapLegend — HU-12: qué significa cada color del mapa (umbrales 40/80 y gris "Sin datos"). */
</script>

<template>
  <div
    class="pointer-events-auto rounded-[10px] border bg-popover/95 px-3 py-2.5 text-popover-foreground shadow-[var(--pv-shadow-md)] backdrop-blur-sm"
    role="group"
    aria-label="Leyenda del mapa"
  >
    <p class="mb-1.5 text-micro font-semibold tracking-[0.04em] text-muted-foreground uppercase">Ocupación</p>
    <ul class="grid gap-1">
      <li v-for="c in CLASSIFICATIONS" :key="c" class="flex items-center gap-2 text-caption">
        <span class="size-2.5 shrink-0 rounded-full border border-white shadow-sm" :style="{ background: classificationColor(c) }" />
        <span class="font-semibold text-heading">{{ classificationLabel(c) }}</span>
        <span class="text-muted-foreground">{{ CLASSIFICATION_RANGE[c] }}</span>
      </li>
    </ul>
  </div>
</template>
