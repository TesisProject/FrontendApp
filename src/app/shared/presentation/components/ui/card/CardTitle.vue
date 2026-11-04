<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from '@/app/shared/helpers/utils'

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <h3
    data-slot="card-title"
    :class="cn('text-title leading-tight font-semibold text-heading text-balance', props.class)"
  >
    <slot />
  </h3>
</template>
