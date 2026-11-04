<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { CircleAlert, ExternalLink, Loader2, Route } from '@lucide/vue'
import { Button } from '@/app/shared/presentation/components/ui/button'
import type { LatLng } from '../../domain/geo'
import { formatDistance } from '../../domain/geo'
import { formatDuration, googleMapsDirectionsUrl, hasValidCoords, wazeUrl } from '../../domain/navigation-links'
import { estimateDrivingRoute, type RouteEstimate } from '../../infrastructure/route-estimate'

/**
 * ZoneDirections — HU-29 "Cómo llegar": distancia y tiempo en auto desde la ubicación del usuario
 * (servicio de rutas de Google Maps) y botones para abrir la navegación en Waze o en Google Maps.
 * Si faltan las coordenadas de la zona, o el servicio no responde o no se puede abrir, lo dice.
 */
const props = defineProps<{
  latitude:  number
  longitude: number
  /** Posición del usuario; sin ella solo se ofrecen los enlaces. */
  origin:    LatLng | null
}>()

const destination = computed<LatLng | null>(() =>
  hasValidCoords(props.latitude, props.longitude) ? { lat: props.latitude, lng: props.longitude } : null,
)

const estimate = ref<RouteEstimate | null>(null)
const estimating = ref(false)
const estimateFailed = ref(false)
let request = 0

watch([destination, () => props.origin], async ([dest, origin]) => {
  const current = ++request
  estimate.value = null
  estimateFailed.value = false
  if (!dest || !origin) return
  estimating.value = true
  try {
    const result = await estimateDrivingRoute(origin, dest)
    if (current === request) estimate.value = result
  } catch {
    if (current === request) estimateFailed.value = true
  } finally {
    if (current === request) estimating.value = false
  }
}, { immediate: true })

/**
 * Abre el enlace en otra pestaña (en el celular, la app de Waze/Maps lo intercepta). Si el navegador
 * lo bloquea, se avisa en vez de no hacer nada.
 */
function openRoute(app: 'waze' | 'google') {
  const dest = destination.value
  if (!dest) {
    toast.error('Esta zona no tiene una ubicación registrada, no se puede trazar la ruta.')
    return
  }
  const url = app === 'waze' ? wazeUrl(dest) : googleMapsDirectionsUrl(dest, props.origin)
  try {
    const opened = window.open(url, '_blank')
    if (!opened) throw new Error('bloqueado')
    opened.opener = null
  } catch {
    toast.error(
      `No se pudo abrir ${app === 'waze' ? 'Waze' : 'Google Maps'}. El servicio no está disponible `
      + 'temporalmente o el navegador bloqueó la ventana; inténtalo de nuevo.',
    )
  }
}
</script>

<template>
  <div class="grid gap-2">
    <p v-if="!destination" class="flex items-start gap-1.5 text-body text-destructive" role="alert">
      <CircleAlert class="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      Esta zona no tiene una ubicación registrada, así que no se puede calcular la ruta.
    </p>

    <template v-else>
      <p v-if="estimating" class="flex items-center gap-1.5 text-body text-muted-foreground" role="status">
        <Loader2 class="size-3.5 animate-spin" aria-hidden="true" /> Calculando la ruta...
      </p>
      <p v-else-if="estimate" class="flex items-center gap-1.5 text-body text-foreground">
        <Route class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span>
          <strong class="font-semibold">{{ formatDistance(estimate.distanceMeters) }}</strong>
          · {{ formatDuration(estimate.durationSeconds) }} en auto desde tu ubicación
        </span>
      </p>
      <p v-else-if="estimateFailed" class="flex items-start gap-1.5 text-body text-muted-foreground" role="status">
        <CircleAlert class="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden="true" />
        El servicio de rutas no está disponible temporalmente. Puedes abrir la ruta en Waze o Google Maps.
      </p>
      <p v-else-if="!origin" class="text-body text-muted-foreground">
        Activa tu ubicación para ver la distancia y el tiempo estimado.
      </p>

      <div class="flex flex-wrap gap-2">
        <Button size="sm" class="rounded-full px-3.5 text-caption" @click="openRoute('waze')">
          <ExternalLink class="size-3.5" aria-hidden="true" /> Abrir en Waze
        </Button>
        <Button size="sm" variant="outline" class="rounded-full px-3.5 text-caption" @click="openRoute('google')">
          <ExternalLink class="size-3.5" aria-hidden="true" /> Google Maps
        </Button>
      </div>
    </template>
  </div>
</template>
