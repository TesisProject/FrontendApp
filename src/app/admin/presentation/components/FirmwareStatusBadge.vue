<script setup lang="ts">
import { computed } from 'vue'
import { FIRMWARE_STATUS_META, type FirmwareStatus } from '../../domain/camera-device'
import { Badge } from '@/app/shared/presentation/components/ui/badge'

/**
 * FirmwareStatusBadge — estado del firmware de una cámara (asignada frente a informada). La
 * explicación de cada estado va en `title` y, para lectores de pantalla, en el texto oculto.
 */
const props = defineProps<{
  status:   FirmwareStatus
  target:   number | null
  reported: number | null
  /** Muestra las versiones junto al estado (v2→v3). */
  showVersions?: boolean
}>()

const meta = computed(() => FIRMWARE_STATUS_META[props.status])

const versions = computed(() => {
  const { target, reported } = props
  if (target === null && reported === null) return null
  if (target === null) return `v${reported}`
  if (reported === null || reported === target) return `v${target}`
  return `v${reported}→v${target}`
})
</script>

<template>
  <span class="inline-flex items-center gap-1.5" :title="meta.help">
    <span v-if="showVersions && versions" class="font-mono text-xs">{{ versions }}</span>
    <Badge :variant="meta.variant" size="status">{{ meta.label }}</Badge>
    <span class="sr-only">{{ meta.help }}</span>
  </span>
</template>
