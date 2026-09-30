<script setup lang="ts">
/** PageHeader — título + subtítulo de las vistas de la app de usuario; acciones en el slot `actions`. */
defineProps<{
  title: string
  sub?: string
}>()
</script>

<template>
  <header class="flex flex-wrap items-start justify-between gap-4">
    <div>
      <h1 class="mb-1 font-display text-[22px] leading-tight font-bold tracking-[-0.01em] text-heading">{{ title }}</h1>
      <p v-if="sub" class="text-[13px] text-muted-foreground">{{ sub }}</p>
    </div>
    <div v-if="$slots.actions" class="flex items-center gap-2.5">
      <slot name="actions" />
    </div>
  </header>
</template>
