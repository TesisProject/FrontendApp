<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../application/auth.store'
import AuthCard from '../../../shared/presentation/components/ui/AuthCard.vue'
import AuthAlert from '../../../shared/presentation/components/ui/AuthAlert.vue'
import SubmitButton from '../../../shared/presentation/components/ui/SubmitButton.vue'

const router    = useRouter()
const route     = useRoute()
const authStore = useAuthStore()

const email     = computed(() => route.query.email as string ?? '')
const digits    = ref<string[]>(['', '', '', '', ''])
const inputRefs = ref<HTMLInputElement[]>([])
const countdown = ref(30)

let timer: ReturnType<typeof setInterval> | null = null

const code = computed(() => digits.value.join(''))

function startCountdown() {
  if (timer) clearInterval(timer)
  countdown.value = 30
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer!)
      timer = null
    }
  }, 1000)
}

onMounted(startCountdown)
onUnmounted(() => { if (timer) clearInterval(timer) })

function onInput(index: number, event: Event) {
  const target = event.target as HTMLInputElement
  const val = target.value.replace(/\D/g, '').slice(-1)
  digits.value[index] = val
  if (val && index < 4) {
    inputRefs.value[index + 1]?.focus()
  }
}

function onKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace' && !digits.value[index] && index > 0) {
    inputRefs.value[index - 1]?.focus()
  }
}

function onPaste(event: ClipboardEvent) {
  event.preventDefault()
  const text = event.clipboardData?.getData('text').replace(/\D/g, '').slice(0, 5) ?? ''
  text.split('').forEach((char, i) => { digits.value[i] = char })
  const nextEmpty = digits.value.findIndex(d => !d)
  inputRefs.value[nextEmpty === -1 ? 4 : nextEmpty]?.focus()
}

async function handleSubmit() {
  if (code.value.length < 5) return
  const ok = await authStore.verifyOtp(email.value, code.value)
  if (ok) router.push({ path: '/reset-password', query: { email: email.value, code: code.value } })
}

function handleResend() {
  if (countdown.value > 0) return
  authStore.forgotPassword(email.value)
  startCountdown()
}
</script>

<template>
  <AuthCard
    back
    eyebrow="Recuperación"
    title="Verifica tu correo"
    sub="Ingresa el código de 5 dígitos que enviamos a tu correo."
    @back="router.back()"
  >
    <form class="auth-form" @submit.prevent="handleSubmit" novalidate>
      <div class="auth-otp-row" @paste="onPaste">
        <input
          v-for="(digit, i) in digits"
          :key="i"
          :ref="(el) => { if (el) inputRefs[i] = el as HTMLInputElement }"
          :value="digit"
          type="text"
          inputmode="numeric"
          maxlength="1"
          class="auth-otp-input"
          :class="{ 'auth-otp-input--error': !!authStore.recoveryError }"
          @input="onInput(i, $event)"
          @keydown="onKeydown(i, $event)"
        />
      </div>

      <div class="auth-forgot">
        <button
          type="button"
          class="auth-link auth-resend"
          :class="{ 'auth-resend--disabled': countdown > 0 }"
          :disabled="countdown > 0"
          @click="handleResend"
        >
          Reenviar código{{ countdown > 0 ? ` (${countdown}s)` : '' }}
        </button>
      </div>

      <AuthAlert :message="authStore.recoveryError" />

      <SubmitButton
        :loading="authStore.recoveryLoading"
        :label="'Verificar código'"
        loading-label="Verificando..."
      />
    </form>

    <p class="auth-alt">
      <router-link to="/login" class="auth-link">← Volver a iniciar sesión</router-link>
    </p>
  </AuthCard>
</template>

<style scoped>
/* El botón "reenviar" reutiliza .auth-link pero necesita reset de <button> */
.auth-resend {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font: inherit;
}
.auth-resend--disabled {
  color: var(--pv-text-muted);
  cursor: default;
  text-decoration: none;
}
</style>
