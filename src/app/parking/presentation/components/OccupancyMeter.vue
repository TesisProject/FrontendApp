<script setup lang="ts">
/** OccupancyMeter — barra de ocupación continua; el alto se ajusta con `class` (h-1.5 por defecto). */
defineProps<{
  percentage: number
  color: string
}>()
</script>

<template>
  <div
    class="h-1.5 overflow-hidden rounded-full bg-muted"
    role="meter"
    :aria-valuenow="Math.round(percentage)"
    aria-valuemin="0"
    aria-valuemax="100"
    aria-label="Ocupación"
  >
    <div
      class="h-full rounded-full transition-[width] duration-500 ease-out"
      :style="{ width: `${Math.min(100, Math.max(0, percentage))}%`, background: color }"
    />
  </div>
</template>
