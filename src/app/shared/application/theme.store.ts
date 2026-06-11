import { defineStore } from 'pinia'
import { ref } from 'vue'

const DARK_KEY = 'pv_dark_mode'

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(false)

  function apply(dark: boolean) {
    isDark.value = dark
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem(DARK_KEY, dark ? '1' : '0')
  }

  function init() {
    const stored = localStorage.getItem(DARK_KEY)
    apply(stored === '1')
  }

  function setDark(dark: boolean) {
    if (isDark.value !== dark) apply(dark)
  }

  return { isDark, init, setDark }
})
