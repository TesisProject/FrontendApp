<script setup lang="ts">
/**
 * OccupancyBar — barra de ocupación segmentada. Cada segmento es una "plaza":
 * los datos son espacios discretos, no un continuo, y la barra lo dice.
 */
defineProps<{
  percentage: number
  color: string
}>()
</script>

<template>
  <div class="flex items-center gap-2">
    <div
      class="relative h-2.5 max-w-24 flex-1 overflow-hidden rounded-[2px] bg-[#e8edf2] after:absolute after:inset-0 after:bg-[repeating-linear-gradient(90deg,transparent_0_6px,var(--card)_6px_8px)] after:content-['']"
      role="meter"
      :aria-valuenow="Math.round(percentage)"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-label="Ocupación"
    >
      <div class="h-full transition-[width] duration-200" :style="{ width: `${percentage}%`, background: color }" />
    </div>
    <span class="font-mono text-[11px] font-semibold tabular-nums" :style="{ color }">
      {{ Math.round(percentage) }}%
    </span>
  </div>
</template>
