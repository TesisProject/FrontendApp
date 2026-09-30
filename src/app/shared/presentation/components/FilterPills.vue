<script setup lang="ts" generic="T extends string">
/** FilterPills — filtro de categorías en píldoras, con contador opcional (roles, estados, clasificaciones…). */
withDefaults(defineProps<{
  options: { value: T; label: string; count?: number }[]
  label: string
  size?: 'default' | 'sm'
}>(), { size: 'default' })

const model = defineModel<T>({ required: true })
</script>

<template>
  <div class="flex flex-wrap gap-2" :class="size === 'sm' && 'gap-1.5'" role="group" :aria-label="label">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      :aria-pressed="model === o.value"
      class="inline-flex items-center gap-1.5 rounded-full border-[1.5px] font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
      :class="[
        size === 'sm' ? 'px-3 py-1 text-xs' : 'px-3.5 py-1.5 text-xs',
        model === o.value
          ? 'border-emphasis bg-emphasis text-emphasis-foreground'
          : 'border-border bg-card text-muted-foreground hover:border-emphasis hover:text-foreground',
      ]"
      @click="model = o.value"
    >
      {{ o.label }}
      <span
        v-if="o.count !== undefined"
        class="rounded-lg px-1.5 py-px text-[11px] font-bold"
        :class="model === o.value ? 'bg-white/25 dark:bg-black/15' : 'bg-black/10 dark:bg-white/10'"
      >{{ o.count }}</span>
    </button>
  </div>
</template>
