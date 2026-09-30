<script setup lang="ts">
import { computed } from 'vue'

/**
 * OccupancyRing — medidor de anillo de ocupación por zona, la pieza firma del
 * dashboard. Track + relleno con stroke-dasharray/offset, girado -90° para
 * empezar arriba.
 */
const props = defineProps<{
  percentage: number
  color: string
}>()

const R = 22
const C = 2 * Math.PI * R
const offset = computed(() => C * (1 - Math.min(100, Math.max(0, props.percentage)) / 100))
</script>

<template>
  <div class="relative grid size-[54px] shrink-0 place-items-center">
    <svg class="size-[54px] -rotate-90" viewBox="0 0 52 52" aria-hidden="true">
      <circle cx="26" cy="26" :r="R" fill="none" stroke-width="5" class="stroke-muted" />
      <circle
        cx="26"
        cy="26"
        :r="R"
        fill="none"
        stroke-width="5"
        stroke-linecap="round"
        class="transition-[stroke-dashoffset] duration-700 ease-out"
        :style="{ stroke: color, strokeDasharray: C, strokeDashoffset: offset }"
      />
    </svg>
    <span class="absolute font-display text-sm font-bold text-heading tabular-nums">
      {{ Math.round(percentage) }}<span class="text-[8px] text-muted-foreground">%</span>
    </span>
  </div>
</template>
