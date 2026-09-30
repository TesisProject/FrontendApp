<script setup lang="ts">
import type { Component } from 'vue'
import { CircleAlert, Loader2 } from '@lucide/vue'

/**
 * StateMessage — estado centrado de una vista o sección: carga, error o vacío.
 * Para `empty` se puede pasar un ícono, un título y una acción (slot `action`);
 * el texto principal va en el slot por defecto.
 */
withDefaults(defineProps<{
  tone?: 'loading' | 'error' | 'empty'
  icon?: Component
  title?: string
  compact?: boolean
}>(), { tone: 'loading' })
</script>

<template>
  <div
    class="flex flex-col items-center gap-2.5 text-center"
    :class="compact ? 'py-5' : 'py-14'"
    :role="tone === 'error' ? 'alert' : tone === 'loading' ? 'status' : undefined"
  >
    <Loader2 v-if="tone === 'loading'" class="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
    <CircleAlert v-else-if="tone === 'error'" class="size-5 text-destructive" aria-hidden="true" />
    <component :is="icon" v-else-if="icon" class="mb-2 size-12 stroke-[1.5] text-muted-foreground/50" aria-hidden="true" />

    <p v-if="title" class="text-base font-semibold text-foreground">{{ title }}</p>
    <p v-if="$slots.default" class="max-w-sm text-[13px]" :class="tone === 'error' ? 'text-destructive' : 'text-muted-foreground'">
      <slot />
    </p>
    <div v-if="$slots.action" class="mt-2">
      <slot name="action" />
    </div>
  </div>
</template>
