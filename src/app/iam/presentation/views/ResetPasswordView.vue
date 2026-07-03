<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../application/auth.store'
import AuthCard from '../../../shared/presentation/components/ui/AuthCard.vue'
import AuthField from '../../../shared/presentation/components/ui/AuthField.vue'
import AuthInput from '../../../shared/presentation/components/ui/AuthInput.vue'
import AuthAlert from '../../../shared/presentation/components/ui/AuthAlert.vue'
import SubmitButton from '../../../shared/presentation/components/ui/SubmitButton.vue'

const router    = useRouter()
const route     = useRoute()
const authStore = useAuthStore()

const email      = computed(() => route.query.email as string ?? '')
const code       = computed(() => route.query.code  as string ?? '')
const password   = ref('')
const confirmPw  = ref('')
const localError = ref('')

async function handleSubmit() {
  localError.value = ''
  if (password.value.length < 8) {
    localError.value = 'Mínimo 8 caracteres con letras, números y símbolos'
    return
  }
  if (password.value !== confirmPw.value) {
    localError.value = 'Las contraseñas no coinciden'
    return
  }
  const ok = await authStore.resetPassword(email.value, code.value, password.value)
  if (ok) router.push('/login')
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
    <form class="auth-form" @submit.prevent="handleSubmit" novalidate>
      <AuthField label="Contraseña" hint="Mínimo 8 caracteres con letras, números y símbolos">
        <AuthInput
          v-model="password"
          type="password"
          autocomplete="new-password"
          placeholder="••••••••"
        />
      </AuthField>

      <AuthField label="Confirmar contraseña">
        <AuthInput
          v-model="confirmPw"
          type="password"
          autocomplete="new-password"
          placeholder="••••••••"
        />
      </AuthField>

      <AuthAlert :message="localError || authStore.recoveryError" />

      <SubmitButton
        :loading="authStore.recoveryLoading"
        label="Actualizar contraseña"
        loading-label="Actualizando..."
      />
    </form>
  </AuthCard>
</template>
