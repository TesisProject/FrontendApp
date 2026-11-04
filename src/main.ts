import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'
import { applyThemeToDocument, storedDarkPreference } from './app/shared/application/theme.store'

// Apply surface + dark mode before mount to avoid a flash; the router keeps it
// in sync afterwards (see router.afterEach).
const path = window.location.pathname
const surface = path.startsWith('/dashboard') ? 'user' : path.startsWith('/admin/') ? 'admin' : 'auth'
applyThemeToDocument(surface, storedDarkPreference())

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.mount('#app')

// HU-32: service worker que precachea el app shell (la Ayuda funciona sin conexión). Solo en el build:
// en `pnpm dev` no existe sw.js y cachear rompería la recarga en caliente.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('[PWA] sin service worker:', err))
  })
}
