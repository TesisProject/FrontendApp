<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../application/auth.store'

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
  <div class="card">
    <button class="back-btn" @click="router.back()">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 12H5M12 5l-7 7 7 7"/>
      </svg>
    </button>
    <div class="header">
      <h1 class="title">Recuperar contraseña</h1>
      <p class="subtitle">Actualiza tu contraseña</p>
    </div>

    <div class="form">
      <div class="field">
        <label class="label">Contraseña</label>
        <input v-model="password" type="password" class="input" autocomplete="new-password" />
        <span class="hint">Mínimo 8 caracteres con letras, números y símbolos</span>
      </div>

      <div class="field">
        <label class="label">Confirmar contraseña</label>
        <input v-model="confirmPw" type="password" class="input" autocomplete="new-password" @keyup.enter="handleSubmit" />
      </div>

      <p v-if="localError || authStore.recoveryError" class="error-msg">
        {{ localError || authStore.recoveryError }}
      </p>

      <button class="btn-primary" :disabled="authStore.recoveryLoading" @click="handleSubmit">
        {{ authStore.recoveryLoading ? 'Actualizando...' : 'Actualizar contraseña' }}
      </button>
    </div>
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

.header {
  margin-bottom: 20px;
}

.title {
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  font-size: 22px;
  color: #092c4c;
  margin: 0 0 4px;
}

.subtitle {
  font-size: 13px;
  color: #888;
  margin: 0;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.label {
  font-size: 12px;
  font-weight: 500;
  color: #333;
}

.input {
  height: 40px;
  background: #f8f8f8;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 14px;
  color: #333;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.input:focus {
  border-color: #f2894a;
}

.hint {
  font-size: 11px;
  color: #888;
}

.error-msg {
  font-size: 13px;
  color: #e53e3e;
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
