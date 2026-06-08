<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../application/auth.store'

const router    = useRouter()
const route     = useRoute()
const authStore = useAuthStore()

const email     = computed(() => route.query.email as string ?? '')
const digits    = ref<string[]>(['', '', '', '', ''])
const inputRefs = ref<HTMLInputElement[]>([])
const countdown = ref(30)

const code = computed(() => digits.value.join(''))

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
  countdown.value = 30
  const interval = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) clearInterval(interval)
  }, 1000)
}
</script>

<template>
  <div class="card">
    <button class="back-btn" @click="router.back()">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 12H5M12 5l-7 7 7 7"/>
      </svg>
    </button>
    <h1 class="title">Recuperar contraseña</h1>
    <p class="subtitle">Ingresa el código OTP que llegó a tu correo</p>

    <div class="otp-row" @paste="onPaste">
      <input
        v-for="(digit, i) in digits"
        :key="i"
        :ref="(el) => { if (el) inputRefs[i] = el as HTMLInputElement }"
        :value="digit"
        type="text"
        inputmode="numeric"
        maxlength="1"
        class="otp-input"
        :class="{ 'otp-error': !!authStore.recoveryError }"
        @input="onInput(i, $event)"
        @keydown="onKeydown(i, $event)"
      />
    </div>

    <div class="resend-row">
      <span
        class="resend-link"
        :class="{ disabled: countdown > 0 }"
        @click="handleResend"
      >
        Reenviar código{{ countdown > 0 ? ` (${countdown}s)` : '' }}
      </span>
    </div>

    <p v-if="authStore.recoveryError" class="error-msg">{{ authStore.recoveryError }}</p>

    <button class="btn-primary" :disabled="authStore.recoveryLoading || code.length < 5" @click="handleSubmit">
      {{ authStore.recoveryLoading ? 'Verificando...' : 'Enviar' }}
    </button>
  </div>
</template>

<style scoped>
.card {
  background: white;
  border-radius: 16px;
  box-shadow: 0px 4px 20px 0px rgba(0, 0, 0, 0.08);
  width: 400px;
  padding: 28px 32px;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: #092c4c;
  padding: 4px;
  margin-bottom: 12px;
  border-radius: 6px;
  transition: background 0.2s;
}

.back-btn:hover {
  background: #f5f5f5;
}

.title {
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  font-size: 22px;
  color: #092c4c;
  margin: 0 0 8px;
}

.subtitle {
  font-size: 13px;
  color: #888;
  margin: 0 0 24px;
}

.otp-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.otp-input {
  flex: 1;
  height: 56px;
  background: white;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  text-align: center;
  font-size: 22px;
  font-weight: 700;
  color: #092c4c;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  min-width: 0;
}

.otp-input:focus {
  border-color: #f2894a;
  box-shadow: 0 0 0 3px rgba(242, 137, 74, 0.12);
}

.otp-error {
  border-color: #e53e3e !important;
}

.resend-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.resend-link {
  font-size: 11px;
  color: #092c4c;
  text-decoration: underline;
  cursor: pointer;
}

.resend-link.disabled {
  color: #888;
  cursor: default;
  text-decoration: none;
}

.error-msg {
  font-size: 13px;
  color: #e53e3e;
  margin-bottom: 8px;
}

.btn-primary {
  width: 100%;
  height: 44px;
  background: #f2894a;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #e07a3a;
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
