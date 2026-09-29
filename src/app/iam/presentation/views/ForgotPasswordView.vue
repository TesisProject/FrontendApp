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
    <form class="mb-[18px] flex flex-col gap-3.5" @submit.prevent="handleSubmit" novalidate>
      <AuthField label="Correo electrónico">
        <AuthInput
          v-model="email"
          type="email"
          autocomplete="email"
          placeholder="tucorreo@ejemplo.com"
        />
      </AuthField>

      <FormAlert :message="authStore.recoveryError" />

      <SubmitButton
        :loading="authStore.recoveryLoading"
        label="Enviar código"
        loading-label="Enviando..."
      />
    </form>

    <p class="text-center text-[13px] text-muted-foreground">
      <TextLink to="/login">← Volver a iniciar sesión</TextLink>
    </p>
  </AuthCard>
</template>
