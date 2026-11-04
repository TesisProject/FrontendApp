<script setup lang="ts">
import { computed } from 'vue'
import { Clock } from '@lucide/vue'
import { Badge } from '@/app/shared/presentation/components/ui/badge'
import { staleNotice, type AvailabilityFreshness } from '../../domain/availability-freshness'

/**
 * StaleBadge — HU-08: "Datos no actualizados · HH:mm" cuando la última detección de la zona tiene más
 * de 90 s. No se muestra si los datos están al día.
 */
const props = defineProps<{ freshness: AvailabilityFreshness }>()

const text = computed(() => staleNotice(props.freshness))
</script>

<template>
  <Badge v-if="text" variant="warning" size="pill" class="gap-1" role="status">
    <Clock class="size-3" aria-hidden="true" />
    {{ text }}
  </Badge>
</template>
