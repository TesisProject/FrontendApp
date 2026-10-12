<script setup lang="ts">
import { Skeleton } from '@/app/shared/presentation/components/ui/skeleton'

/** Silueta de `ZoneSpacesPanel` mientras cargan los espacios y las fotos: mismas tarjetas, sin saltos. */
const CARDS = 2
const CHIPS = [3, 4]
</script>

<template>
  <div class="grid gap-3.5 md:grid-cols-2" role="status" aria-label="Cargando espacios">
    <div v-for="c in CARDS" :key="c" class="overflow-hidden rounded-xl border bg-card">
      <Skeleton class="aspect-video w-full rounded-none" />
      <div class="flex gap-1.5 p-3">
        <Skeleton v-for="i in CHIPS[c - 1]" :key="i" class="h-8 w-14" />
      </div>
    </div>
    <span class="sr-only">Cargando espacios...</span>
  </div>
</template>
