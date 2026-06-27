<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { useAuthStore } from '../../application/auth.store'

const router    = useRouter()
const authStore = useAuthStore()

const schema = toTypedSchema(z.object({
  email:    z.preprocess(val => val ?? '', z.string().min(1, 'El correo es requerido').email('Ingresa un correo válido')),
  password: z.preprocess(val => val ?? '', z.string().min(1, 'La contraseña es requerida')),
}))

const { errors, handleSubmit, defineField } = useForm({
  validationSchema: schema,
  validateOnMount:  false,
})

// onTouched: validate on blur first time, then re-validate on every change
const fieldOpts = (state: { touched: boolean }) => ({
  validateOnBlur:        true,
  validateOnModelUpdate: state.touched,
})

const [email, emailAttrs]       = defineField('email',    fieldOpts)
const [password, passwordAttrs] = defineField('password', fieldOpts)

// track which fields the user has interacted with (for green valid border)
const touched = reactive({ email: false, password: false })

const onSubmit = handleSubmit(async (values) => {
  const ok = await authStore.login(values.email, values.password)
  if (ok) router.push('/dashboard')
})
</script>

<template>
  <div class="card">
    <h1 class="title">Bienvenido de vuelta</h1>
    <p class="subtitle">Ingresa tus credenciales para continuar</p>

    <form @submit.prevent="onSubmit" novalidate>
      <div class="field">
        <label class="label">Correo electrónico</label>
        <input
          v-model="email"
          v-bind="emailAttrs"
          type="email"
          class="input"
          :class="{
            'input--error': errors.email,
            'input--valid': touched.email && !errors.email,
          }"
          autocomplete="email"
          @blur="touched.email = true"
        />
        <Transition name="field-msg">
          <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
        </Transition>
      </div>

      <div class="field">
        <label class="label">Contraseña</label>
        <input
          v-model="password"
          v-bind="passwordAttrs"
          type="password"
          class="input"
          :class="{
            'input--error': errors.password,
            'input--valid': touched.password && !errors.password,
          }"
          autocomplete="current-password"
          @blur="touched.password = true"
        />
        <Transition name="field-msg">
          <span v-if="errors.password" class="field-error">{{ errors.password }}</span>
        </Transition>
      </div>

      <div class="forgot-row">
        <router-link to="/forgot-password" class="link-primary">¿Olvidaste tu contraseña?</router-link>
      </div>

      <Transition name="field-msg">
        <p v-if="authStore.loginError" class="error-msg">{{ authStore.loginError }}</p>
      </Transition>

      <button class="btn-primary" type="submit" :disabled="authStore.loginLoading">
        <span v-if="authStore.loginLoading" class="btn-spinner-wrap">
          <svg class="spinner" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="31.4" stroke-dashoffset="10"/>
          </svg>
          Iniciando sesión...
        </span>
        <span v-else>Iniciar sesión</span>
      </button>
    </form>

    <p class="register-text">
      ¿No tienes cuenta?
      <router-link to="/register" class="link-primary link-underline">Regístrate aquí</router-link>
    </p>
  </div>
</template>

<style scoped>
.card {
  background: rgba(255, 255, 255, 0.97);
  border-radius: 20px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.35), 0 1px 0 rgba(255, 255, 255, 0.08) inset;
  width: 380px;
  padding: 36px 32px;
  backdrop-filter: blur(12px);
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
  /* reserve space so layout doesn't jump when error appears */
  min-height: 68px;
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

.input--error {
  border-color: #e53e3e;
  box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.1);
}

.input--error:focus {
  border-color: #e53e3e;
  box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.15);
}

.input--valid {
  border-color: #38a169;
  box-shadow: 0 0 0 3px rgba(56, 161, 105, 0.08);
}

.input--valid:focus {
  border-color: #38a169;
  box-shadow: 0 0 0 3px rgba(56, 161, 105, 0.14);
}

.field-error {
  font-size: 12px;
  color: #e53e3e;
  margin-top: 2px;
}

/* slide-down transition for error/success messages */
.field-msg-enter-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.field-msg-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.field-msg-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}
.field-msg-leave-to {
  opacity: 0;
  transform: translateY(-4px);
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
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-primary:hover:not(:disabled) {
  background: #e07a3a;
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-spinner-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.spinner {
  width: 18px;
  height: 18px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.register-text {
  text-align: center;
  font-size: 12px;
  color: #888;
}
</style>
