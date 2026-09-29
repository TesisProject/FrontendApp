<script setup lang="ts">
import { CircleAlert, Loader2 } from '@lucide/vue'

/** AdminStateBox — estado de carga o error en lugar de la tabla. */
withDefaults(defineProps<{ tone?: 'loading' | 'error' }>(), { tone: 'loading' })
</script>

<template>
  <div
    class="flex flex-col items-center gap-3 rounded-xl border px-6 py-12 text-center text-sm"
    :class="tone === 'error'
      ? 'border-destructive/25 bg-destructive-soft text-destructive'
      : 'bg-card text-muted-foreground'"
    :role="tone === 'error' ? 'alert' : 'status'"
  >
    <CircleAlert v-if="tone === 'error'" class="size-6" />
    <Loader2 v-else class="size-6 animate-spin text-primary" />
    <slot />
  </div>
</template>
