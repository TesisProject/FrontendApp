<script setup lang="ts">
import { ref } from 'vue'
import { Star } from '@lucide/vue'

/**
 * StarRating — 1 a 5 estrellas. `readonly` solo las muestra; editable es un
 * radiogroup (clic, flechas del teclado) con vista previa al pasar el cursor.
 */
const props = withDefaults(defineProps<{
  readonly?: boolean
  size?: number
  label?: string
}>(), { readonly: false, size: 13, label: 'Calificación' })

const model = defineModel<number>({ default: 0 })
const hovered = defineModel<number>('hovered', { default: 0 })
const group = ref<HTMLElement | null>(null)

function select(n: number) {
  if (props.readonly) return
  model.value = n
}

function onKeydown(e: KeyboardEvent) {
  const delta = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key]
  if (!delta) return
  e.preventDefault()
  const next = Math.min(5, Math.max(1, (model.value || 0) + delta))
  model.value = next
  group.value?.querySelectorAll<HTMLElement>('[role=radio]')[next - 1]?.focus()
}
</script>

<template>
  <div
    v-if="readonly"
    class="flex gap-0.5"
    role="img"
    :aria-label="`${model} de 5 estrellas`"
  >
    <Star
      v-for="n in 5"
      :key="n"
      :size="size"
      :stroke-width="0"
      :class="n <= model ? 'fill-amber-500' : 'fill-muted-foreground/25'"
    />
  </div>

  <div
    v-else
    ref="group"
    class="flex items-center gap-1"
    role="radiogroup"
    :aria-label="label"
    @mouseleave="hovered = 0"
    @keydown="onKeydown"
  >
    <button
      v-for="n in 5"
      :key="n"
      type="button"
      role="radio"
      :aria-checked="model === n"
      :aria-label="`${n} ${n === 1 ? 'estrella' : 'estrellas'}`"
      :tabindex="(model || 1) === n ? 0 : -1"
      class="rounded-sm transition-transform hover:scale-115 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
      @mouseenter="hovered = n"
      @click="select(n)"
    >
      <Star
        :size="size"
        :stroke-width="0"
        :class="n <= (hovered || model) ? 'fill-amber-500' : 'fill-muted-foreground/25'"
      />
    </button>
  </div>
</template>
