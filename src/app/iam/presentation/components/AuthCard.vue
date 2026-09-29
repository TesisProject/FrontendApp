<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import { Button } from '@/app/shared/presentation/components/ui/button'

/**
 * AuthCard — contenedor de cada pantalla de auth: animación de entrada, botón
 * "volver" opcional y cabecera (eyebrow · título · subtítulo). El formulario y
 * los enlaces van en el slot por defecto.
 */
defineProps<{
  eyebrow?: string
  title: string
  sub?: string
  back?: boolean
}>()

defineEmits<{ back: [] }>()
</script>

<template>
  <div class="w-full max-w-[410px] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3.5 motion-safe:duration-500">
    <Button
      v-if="back"
      variant="outline"
      size="icon"
      class="mb-5 size-[38px] rounded-[11px] border-(--pv-border) text-ink hover:-translate-x-0.5 hover:border-ink hover:bg-[#f6f8fb] hover:text-ink"
      aria-label="Volver"
      @click="$emit('back')"
    >
      <ArrowLeft class="size-5" />
    </Button>

    <p v-if="eyebrow" class="mb-2.5 text-[11px] font-semibold tracking-[0.15em] text-link uppercase">
      {{ eyebrow }}
    </p>
    <h1 class="mb-2 font-display text-[29px] leading-[1.08] font-bold tracking-[-0.02em] text-ink">
      {{ title }}
    </h1>
    <p v-if="sub" class="mb-[26px] text-sm leading-normal text-muted-foreground">{{ sub }}</p>

    <slot />
  </div>
</template>
