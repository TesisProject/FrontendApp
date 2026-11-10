import { onMounted, onUnmounted, ref } from 'vue'
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

interface UseUserLocationOptions {
  /**
   * Sigue la posición con `watchPosition` después de obtenerla (HU-13: las recomendaciones se
   * recalculan al moverse). Por defecto se lee una sola vez.
   */
  watch?: boolean
}

/**
 * Ubicación del usuario con `navigator.geolocation`. Al montar solo se consulta si el permiso ya
 * está concedido (no se abre el aviso del navegador sin que el usuario lo pida); `request()` lo pide.
 */
export function useUserLocation(options: UseUserLocationOptions = {}) {
  const position = ref<LatLng | null>(null)
  const status = ref<UserLocationStatus>('idle')
  let watchId: number | null = null
  let permissionStatus: PermissionStatus | null = null

  function onPermissionChange() {
    if (permissionStatus?.state === 'granted' && status.value !== 'ready') request()
  }

  function onSuccess(pos: GeolocationPosition) {
    position.value = { lat: pos.coords.latitude, lng: pos.coords.longitude }
    status.value = 'ready'
  }

  function onError(err: GeolocationPositionError) {
    // Si ya había posición, un fallo puntual del seguimiento no la invalida.
    if (watchId != null && position.value && err.code !== err.PERMISSION_DENIED) return
    status.value = err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'
  }

  function request() {
    if (!('geolocation' in navigator)) {
      status.value = 'unsupported'
      return
    }
    status.value = 'locating'
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onSuccess(pos)
        if (options.watch && watchId == null) {
          watchId = navigator.geolocation.watchPosition(onSuccess, onError, GEO_OPTIONS)
        }
      },
      onError,
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
      // HU-06 (CP016): si el usuario vuelve a permitir la ubicación desde el navegador, se reintenta sola.
      if (permission) {
        permissionStatus = permission
        permission.addEventListener('change', onPermissionChange)
      }
    } catch {
      // Permissions API no disponible (algunos Safari): se espera a que el usuario lo pida.
    }
  })

  onUnmounted(() => {
    if (watchId != null) navigator.geolocation.clearWatch(watchId)
    permissionStatus?.removeEventListener('change', onPermissionChange)
  })

  return { position, status, request }
}
