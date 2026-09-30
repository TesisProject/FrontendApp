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

  function setDark(dark: boolean) {
    if (isDark.value === dark) return
    isDark.value = dark
    localStorage.setItem(DARK_KEY, dark ? '1' : '0')
    apply()
  }

  function setSurface(next: Surface) {
    surface.value = next
    apply()
  }

  return { isDark, surface, init, setDark, setSurface }
})
