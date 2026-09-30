<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { RouterLink } from 'vue-router'

/**
 * TextLink — enlace de texto de marca (color --link, AA sobre blanco).
 * Con `to` navega con el router; sin él se comporta como <a> (usa `href`).
 */
defineProps<{ to?: RouteLocationRaw }>()
</script>

<template>
  <component
    :is="to ? RouterLink : 'a'"
    :to="to"
    class="rounded-sm text-[13px] font-medium text-link underline-offset-2 hover:underline focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
  >
    <slot />
  </component>
</template>
