<script setup lang="ts" generic="T extends string | number">
import { useId } from 'vue'

/**
 * AdminSegmented — elección única entre pocas opciones (rol de una key, rotación…) como botones
 * segmentados. Por debajo son radios nativos: teclado (flechas) y lector de pantalla gratis.
 * `label` es el nombre accesible del grupo; el label visible lo pone `AdminField`.
 */
defineProps<{
  options: readonly { value: T; label: string }[]
  label:   string
  disabled?: boolean
}>()

const model = defineModel<T>({ required: true })
const name  = useId()
</script>

<template>
  <div role="radiogroup" :aria-label="label" class="inline-flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1">
    <label
      v-for="o in options"
      :key="String(o.value)"
      class="relative cursor-pointer rounded-md px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors
             hover:text-foreground has-[:checked]:bg-card has-[:checked]:text-heading has-[:checked]:shadow-sm
             has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-55"
    >
      <input
        v-model="model"
        type="radio"
        class="sr-only"
        :name="name"
        :value="o.value"
        :disabled="disabled"
      />
      {{ o.label }}
    </label>
  </div>
</template>
