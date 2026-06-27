<script setup lang="ts">
import { reactive, ref } from 'vue'
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
const showPwd = ref(false)

const onSubmit = handleSubmit(async (values) => {
  const ok = await authStore.login(values.email, values.password)
  if (ok) router.push('/dashboard')
})
</script>

<template>
  <div class="auth-card">
    <p class="auth-eyebrow">Bienvenido de vuelta</p>
    <h1 class="auth-title">Inicia sesión</h1>
    <p class="auth-sub">Ingresa tus credenciales para ver la disponibilidad en tiempo real.</p>

    <form class="auth-form" @submit.prevent="onSubmit" novalidate>
      <div class="auth-field">
        <label class="auth-label">Correo electrónico</label>
        <div class="auth-input-wrap">
          <input
            v-model="email"
            v-bind="emailAttrs"
            type="email"
            class="auth-input"
            :class="{
              'auth-input--error': errors.email,
              'auth-input--valid': touched.email && !errors.email,
            }"
            autocomplete="email"
            placeholder="tucorreo@ejemplo.com"
            @blur="touched.email = true"
          />
        </div>
        <Transition name="auth-msg">
          <span v-if="errors.email" class="auth-field-error">{{ errors.email }}</span>
        </Transition>
      </div>

      <div class="auth-field">
        <label class="auth-label">Contraseña</label>
        <div class="auth-input-wrap">
          <input
            v-model="password"
            v-bind="passwordAttrs"
            :type="showPwd ? 'text' : 'password'"
            class="auth-input auth-input--pwd"
            :class="{
              'auth-input--error': errors.password,
              'auth-input--valid': touched.password && !errors.password,
            }"
            autocomplete="current-password"
            placeholder="••••••••"
            @blur="touched.password = true"
          />
          <button
            type="button"
            class="auth-eye"
            :aria-label="showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            @click="showPwd = !showPwd"
          >
            <svg v-if="showPwd" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
        <Transition name="auth-msg">
          <span v-if="errors.password" class="auth-field-error">{{ errors.password }}</span>
        </Transition>
      </div>

      <div class="auth-forgot">
        <router-link to="/forgot-password" class="auth-link">¿Olvidaste tu contraseña?</router-link>
      </div>

      <Transition name="auth-msg">
        <p v-if="authStore.loginError" class="auth-alert">{{ authStore.loginError }}</p>
      </Transition>

      <button class="auth-btn" type="submit" :disabled="authStore.loginLoading">
        <template v-if="authStore.loginLoading">
          <svg class="auth-spinner" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="31.4" stroke-dashoffset="10"/>
          </svg>
          Iniciando sesión...
        </template>
        <template v-else>Iniciar sesión</template>
      </button>
    </form>

    <p class="auth-alt">
      ¿No tienes cuenta?
      <router-link to="/register" class="auth-link">Regístrate aquí</router-link>
    </p>
  </div>
</template>
