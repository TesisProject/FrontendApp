<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../application/auth.store'

const router    = useRouter()
const authStore = useAuthStore()

const email = ref('')

async function handleSubmit() {
  const ok = await authStore.forgotPassword(email.value)
  if (ok) router.push({ path: '/otp', query: { email: email.value } })
}
</script>

<template>
  <div class="auth-card">
    <button class="auth-back" @click="router.back()" aria-label="Volver">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 12H5M12 5l-7 7 7 7"/>
      </svg>
    </button>

    <p class="auth-eyebrow">Recuperación</p>
    <h1 class="auth-title">Recupera tu acceso</h1>
    <p class="auth-sub">Escribe tu correo y te enviaremos un código de verificación para restablecer tu contraseña.</p>

    <form class="auth-form" @submit.prevent="handleSubmit" novalidate>
      <div class="auth-field">
        <label class="auth-label">Correo electrónico</label>
        <div class="auth-input-wrap">
          <input
            v-model="email"
            type="email"
            class="auth-input"
            autocomplete="email"
            placeholder="tucorreo@ejemplo.com"
            @keyup.enter="handleSubmit"
          />
        </div>
      </div>

      <Transition name="auth-msg">
        <p v-if="authStore.recoveryError" class="auth-alert">{{ authStore.recoveryError }}</p>
      </Transition>

      <button class="auth-btn" type="submit" :disabled="authStore.recoveryLoading">
        <template v-if="authStore.recoveryLoading">
          <svg class="auth-spinner" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="31.4" stroke-dashoffset="10"/>
          </svg>
          Enviando...
        </template>
        <template v-else>Enviar código</template>
      </button>
    </form>

    <p class="auth-alt">
      <router-link to="/login" class="auth-link">← Volver a iniciar sesión</router-link>
    </p>
  </div>
</template>
