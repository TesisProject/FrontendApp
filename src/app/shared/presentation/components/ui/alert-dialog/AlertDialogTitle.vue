<script setup lang="ts">
import type { AlertDialogTitleProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { AlertDialogTitle } from "reka-ui"
import { cn } from '@/app/shared/helpers/utils'

const props = defineProps<AlertDialogTitleProps & { class?: HTMLAttributes["class"] }>()

const delegatedProps = reactiveOmit(props, "class")
</script>

<template>
  <AlertDialogTitle
    data-slot="alert-dialog-title"
    v-bind="delegatedProps"
    :class="cn('font-heading text-heading text-xl leading-tight font-semibold tracking-[0.3px]', props.class)"
  >
    <slot />
  </AlertDialogTitle>
</template>
