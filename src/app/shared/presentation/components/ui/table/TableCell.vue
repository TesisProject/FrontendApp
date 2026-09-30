<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from '@/app/shared/helpers/utils'

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <td
    data-slot="table-cell"
    :class="
      cn(
        'px-4 py-3 align-middle tabular-nums [&:has([role=checkbox])]:pr-0 *:[[role=checkbox]]:translate-y-0.5',
        props.class,
      )
    "
  >
    <slot />
  </td>
</template>
