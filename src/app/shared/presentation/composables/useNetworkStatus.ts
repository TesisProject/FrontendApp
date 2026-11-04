import { onMounted, onUnmounted, ref } from 'vue'

/**
 * Conexión del navegador (`navigator.onLine` + eventos `online`/`offline`). `online = false` es
 * fiable (no hay red); `true` solo dice que hay alguna red, no que el backend responda.
 */
export function useNetworkStatus() {
  const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine)

  const update = () => { online.value = navigator.onLine }

  onMounted(() => {
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
  })
  onUnmounted(() => {
    window.removeEventListener('online', update)
    window.removeEventListener('offline', update)
  })

  return { online }
}
