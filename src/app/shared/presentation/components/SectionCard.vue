<script setup lang="ts">
/**
 * SectionCard — tarjeta de sección con título y subtítulo opcionales; acciones
 * a la derecha del título en el slot `actions`, contenido en el slot por defecto.
 */
defineProps<{
  title?: string
  sub?: string
}>()
</script>

<template>
  <section class="rounded-xl border bg-card p-5 text-card-foreground shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
    <div v-if="title || $slots.actions" class="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 v-if="title" class="text-[15px] font-bold text-heading">{{ title }}</h2>
        <p v-if="sub" class="mt-0.5 text-xs text-muted-foreground">{{ sub }}</p>
      </div>
      <slot name="actions" />
    </div>
    <slot />
  </section>
</template>
