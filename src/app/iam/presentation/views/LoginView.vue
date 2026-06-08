<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../application/auth.store'

const router    = useRouter()
const authStore = useAuthStore()

const email    = ref('')
const password = ref('')

async function handleLogin() {
  const ok = await authStore.login(email.value, password.value)
  if (ok) router.push('/dashboard')
}
</script>

<template>
  <div class="card">
    <h1 class="title">Bienvenido de vuelta</h1>
    <p class="subtitle">Ingresa tus credenciales para continuar</p>

    <div class="field">
      <label class="label">Correo electrónico</label>
      <input v-model="email" type="email" class="input" autocomplete="email" />
    </div>

    <div class="field">
      <label class="label">Contraseña</label>
      <input v-model="password" type="password" class="input" autocomplete="current-password" @keyup.enter="handleLogin" />
    </div>

    <div class="forgot-row">
      <router-link to="/forgot-password" class="link-primary">¿Olvidaste tu contraseña?</router-link>
    </div>

    <p v-if="authStore.loginError" class="error-msg">{{ authStore.loginError }}</p>

    <button class="btn-primary" :disabled="authStore.loginLoading" @click="handleLogin">
      {{ authStore.loginLoading ? 'Iniciando sesión...' : 'Iniciar sesión' }}
    </button>

    <p class="register-text">
      ¿No tienes cuenta?
      <router-link to="/register" class="link-primary link-underline">Regístrate aquí</router-link>
    </p>
  </div>
</template>

<style scoped>
.card {
  background: white;
  border-radius: 16px;
  box-shadow: 0px 4px 20px 0px rgba(0, 0, 0, 0.08);
  width: 380px;
  padding: 32px;
}

.title {
  font-family: 'Source Sans 3', 'Inter', sans-serif;
  font-weight: 700;
  font-size: 24px;
  color: #092c4c;
  margin: 0 0 8px;
}

.subtitle {
  font-family: 'Source Sans 3', 'Inter', sans-serif;
  font-size: 14px;
  color: #888;
  line-height: 20px;
  margin: 0 0 28px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 14px;
}

.label {
  font-size: 14px;
  color: #333;
  line-height: 20px;
}

.input {
  height: 42px;
  background: white;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 14px;
  color: #333;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input:focus {
  border-color: #f2894a;
  box-shadow: 0 0 0 3px rgba(242, 137, 74, 0.12);
}

.forgot-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.link-primary {
  color: #f2894a;
  font-size: 14px;
  text-decoration: none;
}

.link-underline {
  text-decoration: underline;
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
  margin-bottom: 16px;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #e07a3a;
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.register-text {
  text-align: center;
  font-size: 12px;
  color: #888;
}
</style>
