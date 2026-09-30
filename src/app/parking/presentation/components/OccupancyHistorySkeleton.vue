<script setup lang="ts">
import { Skeleton } from '@/app/shared/presentation/components/ui/skeleton'

/** Silueta de `OccupancyHistoryChart` (resumen + gráfico) con su misma altura, para que no salte. */
</script>

<template>
  <div class="flex flex-col gap-3" role="status" aria-label="Cargando historial">
    <div class="flex gap-5">
      <Skeleton class="h-4 w-32" />
      <Skeleton class="h-4 w-56" />
    </div>
    <Skeleton class="h-[220px] w-full rounded-lg sm:h-[280px]" />
    <span class="sr-only">Cargando historial...</span>
  </div>
</template>
