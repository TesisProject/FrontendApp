<script setup lang="ts">
/** SpaceCounts — "N libres · M ocupados · T total" de una zona. */
defineProps<{
  free: number
  occupied: number
  total: number
}>()
</script>

<template>
  <p class="flex flex-wrap items-center gap-1.5 text-xs">
    <span class="font-semibold text-success">{{ free }} libres</span>
    <span class="text-muted-foreground/60" aria-hidden="true">·</span>
    <span class="font-semibold text-destructive">{{ occupied }} ocupados</span>
    <span class="text-muted-foreground/60" aria-hidden="true">·</span>
    <span class="text-muted-foreground">{{ total }} total</span>
  </p>
</template>
