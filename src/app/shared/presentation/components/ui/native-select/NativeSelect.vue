<script setup lang="ts">
import type { AcceptableValue } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { ChevronDownIcon } from "@lucide/vue"
import { reactiveOmit, useVModel } from "@vueuse/core"
import { cn } from '@/app/shared/helpers/utils'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<{ modelValue?: AcceptableValue | AcceptableValue[], class?: HTMLAttributes["class"] }>()

const emit = defineEmits<{
  "update:modelValue": [value: AcceptableValue]
}>()

const modelValue = useVModel(props, "modelValue", emit, {
  passive: true,
  defaultValue: "",
})

const delegatedProps = reactiveOmit(props, "class")
</script>

<template>
  <div
    class="group/native-select relative w-full has-[select:disabled]:opacity-50"
    data-slot="native-select-wrapper"
  >
    <select
      v-bind="{ ...$attrs, ...delegatedProps }"
      v-model="modelValue"
      data-slot="native-select"
      :class="cn(
        'border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 dark:hover:bg-input/50 h-10 w-full min-w-0 cursor-pointer appearance-none rounded-lg border-[1.5px] bg-card px-3 py-2 pr-9 text-[13px] transition-[color,border-color,box-shadow] duration-150 outline-none disabled:pointer-events-none disabled:cursor-not-allowed',
        'focus-visible:border-ring focus-visible:ring-ring/15 focus-visible:ring-[3px]',
        'aria-invalid:ring-destructive/12 aria-invalid:ring-[3px] dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        props.class,
      )"
    >
      <slot />
    </select>
    <ChevronDownIcon
      class="text-muted-foreground pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 opacity-50 select-none"
      aria-hidden="true"
      data-slot="native-select-icon"
    />
  </div>
</template>
