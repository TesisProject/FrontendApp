<script setup lang="ts">
/**
 * AdminPage — contenedor de cada vista del panel: ancho máximo y cabecera
 * (título en Barlow con la franja de bahía pintada + subtítulo). Las acciones
 * de la cabecera van en el slot `actions`.
 */
withDefaults(defineProps<{
  title: string
  sub?: string
  narrow?: boolean
}>(), { narrow: false })
</script>

<template>
  <div class="mx-auto w-full" :class="narrow ? 'max-w-[900px]' : 'max-w-[1040px]'">
    <header class="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="bay-stripe mb-1 font-signage text-[30px] leading-[1.05] font-semibold tracking-[0.3px] text-navy">
          {{ title }}
        </h1>
        <p v-if="sub" class="text-[13px] text-muted-foreground">{{ sub }}</p>
      </div>
      <div v-if="$slots.actions" class="flex items-center gap-2.5">
        <slot name="actions" />
      </div>
    </header>

    <slot />
  </div>
</template>
