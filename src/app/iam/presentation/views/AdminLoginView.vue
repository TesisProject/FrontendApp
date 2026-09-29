<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../application/auth.store'
import AuthCard from '../components/AuthCard.vue'
import AuthField from '../components/AuthField.vue'
import AuthInput from '../components/AuthInput.vue'
import FormAlert from '../../../shared/presentation/components/FormAlert.vue'
import SubmitButton from '../components/SubmitButton.vue'
import TextLink from '../../../shared/presentation/components/TextLink.vue'

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
    <form class="mb-[18px] flex flex-col gap-3.5" @submit.prevent="handleLogin" novalidate>
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

      <FormAlert :message="authStore.loginError" />

      <SubmitButton
        :loading="authStore.loginLoading"
        label="Iniciar sesión"
        loading-label="Iniciando sesión..."
      />
    </form>

    <p class="text-center text-[13px] text-muted-foreground">
      <TextLink to="/login">← Volver al acceso de usuario</TextLink>
    </p>
  </AuthCard>
</template>
