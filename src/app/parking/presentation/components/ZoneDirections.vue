<script setup lang="ts">
import { computed } from 'vue'
import { toast } from 'vue-sonner'
import { CircleAlert, ExternalLink } from '@lucide/vue'
import { Button } from '@/app/shared/presentation/components/ui/button'
import type { LatLng } from '../../domain/geo'
import { googleMapsDirectionsUrl, hasValidCoords, wazeUrl } from '../../domain/navigation-links'

/**
 * ZoneDirections — HU-29 "Cómo llegar": botones que abren la navegación hacia la zona en la app de
 * Waze o de Google Maps (en el celular la app intercepta el enlace; en escritorio se abre la web).
 * La ruta la calcula la app de navegación, no la aplicación. Si faltan las coordenadas de la zona o
 * el enlace no se puede abrir, lo dice.
 */
const props = defineProps<{
  latitude:  number
  longitude: number
  /** Posición del usuario; si se conoce, Google Maps parte de ella. */
  origin:    LatLng | null
}>()

const destination = computed<LatLng | null>(() =>
  hasValidCoords(props.latitude, props.longitude) ? { lat: props.latitude, lng: props.longitude } : null,
)

/** Abre el enlace en otra pestaña. Si el navegador lo bloquea, se avisa en vez de no hacer nada. */
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
      `No se pudo abrir ${app === 'waze' ? 'Waze' : 'Google Maps'}. `
      + 'Puede que el navegador haya bloqueado la ventana; inténtalo de nuevo.',
    )
  }
}
</script>

<template>
  <div class="grid gap-2">
    <p v-if="!destination" class="flex items-start gap-1.5 text-body text-destructive" role="alert">
      <CircleAlert class="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      Esta zona no tiene una ubicación registrada, así que no se puede abrir la ruta.
    </p>

    <div v-else class="flex flex-wrap gap-2">
      <Button size="sm" class="rounded-full px-3.5 text-caption" @click="openRoute('waze')">
        <ExternalLink class="size-3.5" aria-hidden="true" /> Abrir en Waze
      </Button>
      <Button size="sm" variant="outline" class="rounded-full px-3.5 text-caption" @click="openRoute('google')">
        <ExternalLink class="size-3.5" aria-hidden="true" /> Google Maps
      </Button>
    </div>
  </div>
</template>
