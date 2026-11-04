<script setup lang="ts">
import { useId } from 'vue'

/**
 * AdminFormSection — bloque titulado de un formulario largo. `section` es la clave que
 * usan `AdminSectionNav` / `useScrollSpy` para ubicarlo (`data-section`).
 */
defineProps<{
  section: string
  title:   string
  sub?:    string
}>()

const headingId = useId()
</script>

<template>
  <section
    :data-section="section"
    :aria-labelledby="headingId"
    class="grid gap-3.5 border-b py-7 first:pt-0 last:border-b-0 last:pb-8"
  >
    <header class="mb-0.5">
      <h3 :id="headingId" class="font-signage text-lead font-semibold tracking-[0.03em] text-heading">{{ title }}</h3>
      <p v-if="sub" class="mt-0.5 text-caption text-muted-foreground">{{ sub }}</p>
    </header>
    <slot />
  </section>
</template>
