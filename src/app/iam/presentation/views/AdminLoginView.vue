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

const email    = ref('')
const password = ref('')

async function handleLogin() {
  const ok = await authStore.adminLogin(email.value, password.value)
  if (ok) router.push('/admin/dashboard')
}
</script>

<template>
  <AuthCard
    eyebrow="Panel administrativo"
    title="Acceso de administrador"
    sub="Ingresa tus credenciales para gestionar zonas, cámaras y usuarios."
  >
    <form class="auth-form" @submit.prevent="handleLogin" novalidate>
      <AuthField label="Correo electrónico">
        <AuthInput
          v-model="email"
          type="email"
          autocomplete="email"
          placeholder="admin@parkvision.com"
        />
      </AuthField>

      <AuthField label="Contraseña">
        <AuthInput
          v-model="password"
          type="password"
          autocomplete="current-password"
          placeholder="••••••••"
        />
      </AuthField>

      <AuthAlert :message="authStore.loginError" />

      <SubmitButton
        :loading="authStore.loginLoading"
        label="Iniciar sesión"
        loading-label="Iniciando sesión..."
      />
    </form>

    <p class="auth-alt">
      <router-link to="/login" class="auth-link">← Volver al acceso de usuario</router-link>
    </p>
  </AuthCard>
</template>
