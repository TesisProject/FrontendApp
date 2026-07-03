<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../application/auth.store'
import AuthCard from '../../../shared/presentation/components/ui/AuthCard.vue'
import AuthField from '../../../shared/presentation/components/ui/AuthField.vue'
import AuthInput from '../../../shared/presentation/components/ui/AuthInput.vue'
import AuthAlert from '../../../shared/presentation/components/ui/AuthAlert.vue'
import SubmitButton from '../../../shared/presentation/components/ui/SubmitButton.vue'

const router    = useRouter()
const authStore = useAuthStore()

const email = ref('')

async function handleSubmit() {
  const ok = await authStore.forgotPassword(email.value)
  if (ok) router.push({ path: '/otp', query: { email: email.value } })
}
</script>

<template>
  <AuthCard
    back
    eyebrow="Recuperación"
    title="Recupera tu acceso"
    sub="Escribe tu correo y te enviaremos un código de verificación para restablecer tu contraseña."
    @back="router.back()"
  >
    <form class="auth-form" @submit.prevent="handleSubmit" novalidate>
      <AuthField label="Correo electrónico">
        <AuthInput
          v-model="email"
          type="email"
          autocomplete="email"
          placeholder="tucorreo@ejemplo.com"
        />
      </AuthField>

      <AuthAlert :message="authStore.recoveryError" />

      <SubmitButton
        :loading="authStore.recoveryLoading"
        label="Enviar código"
        loading-label="Enviando..."
      />
    </form>

    <p class="auth-alt">
      <router-link to="/login" class="auth-link">← Volver a iniciar sesión</router-link>
    </p>
  </AuthCard>
</template>
