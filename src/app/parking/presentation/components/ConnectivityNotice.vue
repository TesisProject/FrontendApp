<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue'
import { Loader2, LocateFixed, LocateOff, Lock, RefreshCw, WifiOff, X } from '@lucide/vue'
import { Button } from '@/app/shared/presentation/components/ui/button'
import type { UserLocationStatus } from '../composables/useUserLocation'

/**
 * ConnectivityNotice — HU-06/HU-07: avisa, sin bloquear la pantalla, que no hay conexión o que el GPS
 * no está disponible, y dice cómo resolverlo. Se puede cerrar; vuelve a aparecer si el problema
 * cambia.
 *
 * CP016: si el usuario no compartió su ubicación se le ofrece permitirla. Si el navegador la tiene
 * bloqueada ya no puede volver a preguntar, así que se muestran los pasos para desbloquearla (se
 * activa sola al permitirla) y, si al comprobar sigue bloqueada, se ofrece recargar la página.
 */
const props = defineProps<{
  online: boolean
  /** Estado de la ubicación; omitirlo si la pantalla no la usa. */
  locationStatus?: UserLocationStatus
  /** El navegador rechaza la ubicación sin preguntar (ver `useUserLocation().blocked`). */
  locationBlocked?: boolean
}>()

const emit = defineEmits<{ 'retry-location': [] }>()

const offlineDismissed = ref(false)
const locationDismissed = ref(false)
/** El usuario pidió reintentar: se muestra el progreso y, si vuelve a fallar, se dice. */
const retried = ref(false)

watch(() => props.online, () => { offlineDismissed.value = false })
watch(() => props.locationStatus, (status) => {
  locationDismissed.value = false
  if (status === 'ready') retried.value = false
})

function retry() {
  retried.value = true
  emit('retry-location')
}

function reload() {
  window.location.reload()
}

interface LocationNotice {
  icon: Component
  title: string
  description?: string
  /** Pasos numerados para resolverlo. */
  steps?: string[]
  action?: { label: string; icon: Component; run: () => void }
  /** Mientras se busca la posición no se puede cerrar ni hay acción. */
  busy?: boolean
}

const UNBLOCK_STEPS = [
  'Toca el ícono a la izquierda de la dirección web (candado o ajustes).',
  'En «Ubicación», elige «Permitir».',
]

const locationNotice = computed<LocationNotice | null>(() => {
  switch (props.locationStatus) {
    case 'locating':
      return retried.value ? { icon: Loader2, title: 'Buscando tu ubicación...', busy: true } : null
    case 'denied':
      if (!props.locationBlocked) {
        return {
          icon: LocateOff,
          title: 'No compartiste tu ubicación',
          description: 'La usamos para mostrarte los estacionamientos más cercanos. También puedes buscar la zona por nombre.',
          action: { label: 'Permitir ubicación', icon: LocateFixed, run: retry },
        }
      }
      if (retried.value) {
        return {
          icon: Lock,
          title: 'La ubicación sigue bloqueada',
          description: 'Revisa los pasos. Si ya la permitiste y no se activa, recarga la página.',
          steps: UNBLOCK_STEPS,
          action: { label: 'Recargar página', icon: RefreshCw, run: reload },
        }
      }
      return {
        icon: Lock,
        title: 'La ubicación está bloqueada',
        description: 'Tu navegador no nos deja volver a pedírtela. Actívala así y la detectaremos sola:',
        steps: UNBLOCK_STEPS,
        action: { label: 'Ya la permití', icon: RefreshCw, run: retry },
      }
    case 'unavailable':
      return {
        icon: LocateOff,
        title: 'No encontramos tu ubicación',
        description: 'Revisa que el GPS (ubicación) del dispositivo esté activado.',
        action: { label: 'Reintentar', icon: RefreshCw, run: retry },
      }
    case 'unsupported':
      return {
        icon: LocateOff,
        title: 'Este navegador no permite usar tu ubicación',
        description: 'Puedes buscar la zona por nombre o distrito.',
      }
    default:
      return null
  }
})

const showOffline = computed(() => !props.online && !offlineDismissed.value)
const showLocation = computed(() => !!locationNotice.value && !locationDismissed.value)

const box = 'flex items-start gap-3 rounded-xl border p-3 text-body leading-snug'
const iconWrap = 'grid size-8 shrink-0 place-items-center rounded-full'
const closeBtn = 'rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
</script>

<template>
  <div v-if="showOffline || showLocation" class="grid gap-2">
    <div v-if="showOffline" :class="[box, 'border-warning/30 bg-warning-soft']" role="status">
      <span :class="[iconWrap, 'bg-warning/15 text-warning']">
        <WifiOff class="size-4" aria-hidden="true" />
      </span>
      <div class="grid flex-1 gap-0.5 pt-0.5">
        <p class="text-title font-semibold text-foreground">Sin conexión a internet</p>
        <p class="text-muted-foreground">
          Mostramos los últimos datos cargados. Se actualizarán cuando vuelvas a conectarte.
        </p>
      </div>
      <button type="button" :class="closeBtn" aria-label="Cerrar aviso" @click="offlineDismissed = true">
        <X class="size-3.5" aria-hidden="true" />
      </button>
    </div>

    <div v-if="showLocation && locationNotice" :class="[box, 'bg-card']" role="status" aria-live="polite">
      <span :class="[iconWrap, 'bg-muted text-muted-foreground']">
        <component :is="locationNotice.icon" :class="['size-4', locationNotice.busy && 'animate-spin']" aria-hidden="true" />
      </span>
      <div class="grid flex-1 gap-1 pt-0.5" :class="locationNotice.busy && 'self-center pt-0'">
        <p class="text-title font-semibold text-foreground">{{ locationNotice.title }}</p>
        <p v-if="locationNotice.description" class="text-muted-foreground">{{ locationNotice.description }}</p>
        <ol v-if="locationNotice.steps" class="mt-0.5 grid gap-1">
          <li v-for="(step, i) in locationNotice.steps" :key="i" class="flex gap-2 text-muted-foreground">
            <span class="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-caption font-semibold text-foreground">
              {{ i + 1 }}
            </span>
            <span class="pt-px">{{ step }}</span>
          </li>
        </ol>
        <div v-if="locationNotice.action" class="mt-1.5">
          <Button size="sm" variant="outline-primary" @click="locationNotice.action.run">
            <component :is="locationNotice.action.icon" aria-hidden="true" />
            {{ locationNotice.action.label }}
          </Button>
        </div>
      </div>
      <button
        v-if="!locationNotice.busy"
        type="button"
        :class="closeBtn"
        aria-label="Cerrar aviso"
        @click="locationDismissed = true"
      >
        <X class="size-3.5" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>
