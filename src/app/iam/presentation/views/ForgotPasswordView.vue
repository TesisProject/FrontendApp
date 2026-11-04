<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { z } from 'zod'
import { useAuthStore } from '../../application/auth.store'
import AuthCard from '../components/AuthCard.vue'
import AuthField from '../components/AuthField.vue'
import AuthInput from '../components/AuthInput.vue'
import FormAlert from '../../../shared/presentation/components/FormAlert.vue'
import SubmitButton from '../components/SubmitButton.vue'
import TextLink from '../../../shared/presentation/components/TextLink.vue'

const router    = useRouter()
const authStore = useAuthStore()

const email      = ref('')
const emailError = ref<string | null>(null)

const emailSchema = z.string().trim().min(1, 'El correo es requerido').email('Ingresa un correo válido')

function validateEmail(): boolean {
  const result = emailSchema.safeParse(email.value)
  emailError.value = result.success ? null : result.error.issues[0].message
  return result.success
}

async function handleSubmit() {
  if (!validateEmail()) return
  // El correo viaja a la pantalla del código por sessionStorage, no por la URL (HU-03).
  const ok = await authStore.forgotPassword(email.value.trim())
  if (ok) router.push('/otp')
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
      <AuthField label="Correo electrónico" :error="emailError">
        <AuthInput
          v-model="email"
          type="email"
          autocomplete="email"
          placeholder="tucorreo@ejemplo.com"
          :error="!!emailError"
          @blur="email && validateEmail()"
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
