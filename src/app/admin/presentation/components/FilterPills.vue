<script setup lang="ts" generic="T extends string">
/** FilterPills — filtro de categorías con contador (roles, estados de alerta…). */
defineProps<{
  options: { value: T; label: string; count: number }[]
  label: string
}>()

const model = defineModel<T>({ required: true })
</script>

<template>
  <div class="mb-3.5 flex flex-wrap gap-2" role="group" :aria-label="label">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      :aria-pressed="model === o.value"
      class="inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
      :class="model === o.value
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-primary'"
      @click="model = o.value"
    >
      {{ o.label }}
      <span
        class="rounded-lg px-1.5 py-px text-[11px] font-bold"
        :class="model === o.value ? 'bg-white/25' : 'bg-black/10'"
      >{{ o.count }}</span>
    </button>
  </div>
</template>
