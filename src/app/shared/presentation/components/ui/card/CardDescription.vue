<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from '@/app/shared/helpers/utils'

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <p
    data-slot="card-description"
    :class="cn('text-body text-muted-foreground text-pretty', props.class)"
  >
    <slot />
  </p>
</template>
