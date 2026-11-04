<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { LocateOff, WifiOff, X } from '@lucide/vue'
import type { UserLocationStatus } from '../composables/useUserLocation'

/**
 * ConnectivityNotice — HU-06/HU-07: avisa, sin bloquear la pantalla, que no hay conexión o que el GPS
 * no está disponible, y sugiere cómo activarlo. Se puede cerrar; vuelve a aparecer si el problema
 * cambia.
 */
const props = defineProps<{
  online: boolean
  /** Estado de la ubicación; omitirlo si la pantalla no la usa. */
  locationStatus?: UserLocationStatus
}>()

const emit = defineEmits<{ 'retry-location': [] }>()

const offlineDismissed = ref(false)
const locationDismissed = ref(false)

watch(() => props.online, () => { offlineDismissed.value = false })
watch(() => props.locationStatus, () => { locationDismissed.value = false })

const locationMessage = computed(() => {
  switch (props.locationStatus) {
    case 'denied':
      return 'Bloqueaste el acceso a tu ubicación. Permítelo en la configuración del navegador para ver los estacionamientos cercanos.'
    case 'unavailable':
      return 'No pudimos obtener tu ubicación. Activa el GPS (ubicación) del dispositivo e inténtalo de nuevo.'
    case 'unsupported':
      return 'Este navegador no permite usar tu ubicación. Puedes buscar la zona por nombre o distrito.'
    default:
      return null
  }
})

const box = 'flex items-start gap-2.5 rounded-[10px] border px-3 py-2.5 text-body leading-snug'
</script>

<template>
  <div v-if="(!online && !offlineDismissed) || (locationMessage && !locationDismissed)" class="grid gap-2">
    <div v-if="!online && !offlineDismissed" :class="[box, 'border-warning/30 bg-warning-soft text-warning']" role="status">
      <WifiOff class="mt-px size-4 shrink-0" aria-hidden="true" />
      <p class="flex-1">
        <strong class="font-semibold">Sin conexión a internet.</strong>
        Se muestran los últimos datos cargados. Activa el Wi-Fi o los datos móviles para actualizar.
      </p>
      <button type="button" class="rounded p-0.5 hover:bg-black/5" aria-label="Cerrar aviso" @click="offlineDismissed = true">
        <X class="size-3.5" aria-hidden="true" />
      </button>
    </div>

    <div v-if="locationMessage && !locationDismissed" :class="[box, 'bg-card text-foreground']" role="status">
      <LocateOff class="mt-px size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <p class="flex-1">
        {{ locationMessage }}
        <button
          v-if="locationStatus === 'unavailable'"
          type="button"
          class="ml-1 font-medium text-link underline-offset-2 hover:underline"
          @click="emit('retry-location')"
        >
          Reintentar
        </button>
      </p>
      <button type="button" class="rounded p-0.5 hover:bg-black/5" aria-label="Cerrar aviso" @click="locationDismissed = true">
        <X class="size-3.5" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>
