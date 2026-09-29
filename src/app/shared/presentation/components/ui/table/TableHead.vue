<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from '@/app/shared/helpers/utils'

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <th
    data-slot="table-head"
    :class="cn('text-muted-foreground bg-muted/50 h-10 px-4 text-left align-middle text-[11px] font-semibold tracking-[0.4px] uppercase whitespace-nowrap [&:has([role=checkbox])]:pr-0 *:[[role=checkbox]]:translate-y-0.5', props.class)"
  >
    <slot />
  </th>
</template>
