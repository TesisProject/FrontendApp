<script setup lang="ts">
import { computed } from 'vue'
import type { AdminCameraBattery } from '../../domain/model/admin-camera.model'

/**
 * BatteryMeter — pila dibujada con el relleno proporcional al porcentaje. Es decorativa: el texto
 * accesible lo pone quien la usa. Gris si la lectura ya no es actual.
 */
const props = withDefaults(defineProps<{
  battery: AdminCameraBattery
  size?:   'sm' | 'lg'
}>(), { size: 'sm' })

const TONE = { OK: 'text-success', LOW: 'text-warning', CRITICAL: 'text-destructive' } as const

const tone  = computed(() => props.battery.stale ? 'text-muted-foreground' : TONE[props.battery.state])
// Un mínimo visible: 0 % no deja de ser una lectura.
const width = computed(() => `${Math.max(props.battery.percent, 6)}%`)
</script>

<template>
  <span
    aria-hidden="true"
    class="relative inline-flex shrink-0 border-current p-px after:absolute after:top-1/2 after:-translate-y-1/2 after:rounded-r-sm after:bg-current"
    :class="[
      tone,
      size === 'lg'
        ? 'h-5 w-10 rounded-[5px] border-2 after:-right-[5px] after:h-2 after:w-[3px]'
        : 'h-[11px] w-[22px] rounded-[3px] border-[1.5px] after:-right-[3.5px] after:h-[5px] after:w-[2px]',
    ]"
  >
    <span class="h-full rounded-[1px] bg-current" :style="{ width }" />
  </span>
</template>
