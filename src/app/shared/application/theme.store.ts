import { defineStore } from 'pinia'
import { ref } from 'vue'

const DARK_KEY = 'pv_dark_mode'

/** Visual surface of the current route; drives the design tokens on <html>. */
export type Surface = 'auth' | 'admin' | 'user'

/** Only the user app supports dark mode; auth + admin always render light. */
export function applyThemeToDocument(surface: Surface, dark: boolean) {
  const root = document.documentElement
  root.dataset.surface = surface
  root.classList.toggle('dark', dark && surface === 'user')
}

/**
 * Último valor conocido del modo oscuro. Es solo una caché para pintar sin parpadeo antes de que
 * responda el backend: la preferencia real vive en la cuenta (`UserPreferences.darkMode`, HU-30) y
 * se aplica al iniciar sesión, así sigue al usuario en cualquier dispositivo.
 */
export function storedDarkPreference(): boolean {
  return localStorage.getItem(DARK_KEY) === '1'
}

export const useThemeStore = defineStore('theme', () => {
  const isDark  = ref(storedDarkPreference())
  const surface = ref<Surface>('auth')

  function apply() {
    applyThemeToDocument(surface.value, isDark.value)
  }

  function init() {
    isDark.value = storedDarkPreference()
    apply()
  }

  /** Aplica el modo y actualiza la caché local. Guardarlo en la cuenta lo hace `profile.store`. */
  function setDark(dark: boolean) {
    localStorage.setItem(DARK_KEY, dark ? '1' : '0')
    if (isDark.value === dark) return
    isDark.value = dark
    apply()
  }

  /** Al cerrar sesión: la caché no debe arrastrar la preferencia de esta cuenta a la siguiente. */
  function forget() {
    localStorage.removeItem(DARK_KEY)
    isDark.value = false
    apply()
  }

  function setSurface(next: Surface) {
    surface.value = next
    apply()
  }

  return { isDark, surface, init, setDark, forget, setSurface }
})
