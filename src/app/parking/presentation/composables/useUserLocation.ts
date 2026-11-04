import { onMounted, ref } from 'vue'
import type { LatLng } from '../../domain/geo'

/**
 * - `idle`: aún no se pidió (el navegador no tiene el permiso concedido).
 * - `locating`: esperando al GPS.
 * - `ready`: hay posición.
 * - `denied`: el usuario bloqueó la ubicación.
 * - `unavailable`: sin GPS, sin señal o se agotó el tiempo.
 * - `unsupported`: el navegador no tiene geolocalización (o la página no es HTTPS).
 */
export type UserLocationStatus = 'idle' | 'locating' | 'ready' | 'denied' | 'unavailable' | 'unsupported'

const GEO_OPTIONS: PositionOptions = { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 }

/**
 * Ubicación del usuario con `navigator.geolocation`. Al montar solo se consulta si el permiso ya
 * está concedido (no se abre el aviso del navegador sin que el usuario lo pida); `request()` lo pide.
 */
export function useUserLocation() {
  const position = ref<LatLng | null>(null)
  const status = ref<UserLocationStatus>('idle')

  function request() {
    if (!('geolocation' in navigator)) {
      status.value = 'unsupported'
      return
    }
    status.value = 'locating'
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        position.value = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        status.value = 'ready'
      },
      (err) => {
        status.value = err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'
      },
      GEO_OPTIONS,
    )
  }

  onMounted(async () => {
    if (!('geolocation' in navigator)) {
      status.value = 'unsupported'
      return
    }
    try {
      const permission = await navigator.permissions?.query({ name: 'geolocation' })
      if (permission?.state === 'granted') request()
      else if (permission?.state === 'denied') status.value = 'denied'
    } catch {
      // Permissions API no disponible (algunos Safari): se espera a que el usuario lo pida.
    }
  })

  return { position, status, request }
}
