<script setup lang="ts">
import { computed } from 'vue'
import type { AdminCameraBattery } from '../../domain/model/admin-camera.model'
import { batteryBadge } from '../../domain/camera-device'
import { formatRelative } from '@/app/shared/helpers/date'
import { Badge } from '@/app/shared/presentation/components/ui/badge'
import BatteryMeter from './BatteryMeter.vue'

/**
 * CameraBatteryIndicator — batería en una celda de tabla: pila, %, mV y, si no está bien o ya no es
 * actual, su estado. Los mV van siempre al lado porque el % es orientativo.
 */
const props = defineProps<{ battery: AdminCameraBattery | null }>()

const badge = computed(() => props.battery ? batteryBadge(props.battery) : null)
// La etiqueta OK de una lectura actual sobra: ya lo dice la pila verde.
const showBadge = computed(() => !!props.battery && (props.battery.stale || props.battery.state !== 'OK'))
const help = computed(() => props.battery && badge.value
  ? `${badge.value.help}\nLectura ${formatRelative(props.battery.capturedAt)}.`
  : 'Sin lectura: la placa nunca envió una válida (sin celda o sin divisor).')
</script>

<template>
  <span v-if="!battery" class="text-muted-foreground" :title="help">
    —<span class="sr-only">{{ help }}</span>
  </span>
  <span v-else class="inline-flex items-center gap-2" :title="help">
    <BatteryMeter :battery="battery" />
    <span class="text-[13px] font-semibold tabular-nums" :class="battery.stale ? 'text-muted-foreground' : 'text-navy'">
      {{ battery.percent }} %
    </span>
    <span class="font-mono text-xs text-muted-foreground">{{ battery.mv }} mV</span>
    <Badge v-if="showBadge && badge" :variant="badge.variant" size="status">{{ badge.label }}</Badge>
    <span class="sr-only">{{ help }}</span>
  </span>
</template>
