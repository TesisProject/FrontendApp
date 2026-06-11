import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'

// Apply dark mode immediately from localStorage to avoid flash on load
const stored = localStorage.getItem('pv_dark_mode')
if (stored === '1') document.documentElement.classList.add('dark')

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.mount('#app')
