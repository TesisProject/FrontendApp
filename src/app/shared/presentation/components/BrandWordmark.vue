<script setup lang="ts">
/** BrandWordmark — isotipo "P" + logotipo ParkVision, sobre fondo oscuro o claro. */
withDefaults(defineProps<{ tone?: 'light' | 'dark' }>(), { tone: 'light' })
</script>

<template>
  <span class="inline-flex items-center gap-[11px]">
    <span
      class="grid size-8 place-items-center rounded-[9px] bg-primary font-display text-[19px] font-bold text-white shadow-[0_4px_14px_rgba(242,137,74,0.4)]"
      aria-hidden="true"
    >P</span>
    <span
      class="font-display text-[19px] font-semibold tracking-[-0.01em]"
      :class="tone === 'light' ? 'text-white' : 'text-ink'"
    >Park<span class="text-primary">Vision</span></span>
  </span>
</template>
