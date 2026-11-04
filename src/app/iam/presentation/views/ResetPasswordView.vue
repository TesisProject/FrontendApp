<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { useAuthStore } from '../../application/auth.store'
import { recoverySession } from '../../infrastructure/recovery-session'
import { isStrongPassword, passwordPolicyMessage } from '../../domain/password-policy'
import AuthCard from '../components/AuthCard.vue'
import AuthField from '../components/AuthField.vue'
import AuthInput from '../components/AuthInput.vue'
import PasswordChecklist from '../components/PasswordChecklist.vue'
import FormAlert from '../../../shared/presentation/components/FormAlert.vue'
import SubmitButton from '../components/SubmitButton.vue'
import { Button } from '@/app/shared/presentation/components/ui/button'

const router    = useRouter()
const authStore = useAuthStore()

// Correo y código verificado vienen de sessionStorage, nunca de la URL (HU-03).
const session    = recoverySession.get()
const email      = session?.email ?? ''
const code       = session?.code ?? ''
const password   = ref('')
const confirmPw  = ref('')
const localError = ref('')
const expired    = ref(false)

const canSubmit = computed(() => isStrongPassword(password.value) && confirmPw.value.length > 0)

onMounted(() => {
  // Sin código verificado no hay nada que restablecer: se vuelve al paso que falta.
  if (!email) router.replace('/forgot-password')
  else if (!code) router.replace('/otp')
})

async function handleSubmit() {
  localError.value = ''
  const policy = passwordPolicyMessage(password.value)
  if (policy) {
    localError.value = policy
    return
  }
  if (password.value !== confirmPw.value) {
    localError.value = 'Las contraseñas no coinciden'
    return
  }
  const result = await authStore.resetPassword(email, code, password.value)
  if (result === 'ok') {
    toast.success('Contraseña actualizada', { description: 'Inicia sesión con tu nueva contraseña.' })
    router.replace('/login')
  } else if (result === 'expired') {
    expired.value = true
  }
}

async function requestNewCode() {
  const ok = await authStore.forgotPassword(email)
  if (ok) router.replace('/otp')
}
</script>

<template>
  <AuthCard
    back
    eyebrow="Recuperación"
    title="Nueva contraseña"
    sub="Crea una contraseña segura para volver a acceder a tu cuenta."
    @back="router.back()"
  >
    <form class="mb-[18px] flex flex-col gap-3.5" @submit.prevent="handleSubmit" novalidate>
      <AuthField label="Contraseña">
        <AuthInput
          v-model="password"
          type="password"
          autocomplete="new-password"
          placeholder="••••••••"
          :disabled="expired"
        />
      </AuthField>
      <PasswordChecklist :password="password" />

      <AuthField label="Confirmar contraseña">
        <AuthInput
          v-model="confirmPw"
          type="password"
          autocomplete="new-password"
          placeholder="••••••••"
          :disabled="expired"
        />
      </AuthField>

      <FormAlert :message="localError || authStore.recoveryError" />

      <Button
        v-if="expired"
        type="button"
        size="xl"
        class="w-full"
        :disabled="authStore.recoveryLoading"
        @click="requestNewCode"
      >
        Solicitar un código nuevo
      </Button>
      <SubmitButton
        v-else
        :loading="authStore.recoveryLoading"
        :disabled="!canSubmit"
        label="Actualizar contraseña"
        loading-label="Actualizando..."
      />
    </form>
  </AuthCard>
</template>
