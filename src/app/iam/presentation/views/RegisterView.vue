<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { useAuthStore } from '../../application/auth.store'

const router    = useRouter()
const authStore = useAuthStore()

// coerce undefined/null to '' so Zod min() shows the right message (not "invalid_type")
const req = (msg: string, min = 1) =>
  z.preprocess(val => val ?? '', z.string().min(min, msg))

const schema = toTypedSchema(z.object({
  firstName:       req('Mínimo 2 caracteres', 2),
  lastName:        req('Mínimo 2 caracteres', 2),
  email:           z.preprocess(val => val ?? '', z.string().min(1, 'El correo es requerido').email('Ingresa un correo válido')),
  phone:           req('Ingresa un teléfono válido', 7),
  password:        req('Mínimo 8 caracteres', 8),
  confirmPassword: req('Confirma tu contraseña', 1),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
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

const [firstName,       firstNameAttrs]       = defineField('firstName',       fieldOpts)
const [lastName,        lastNameAttrs]        = defineField('lastName',        fieldOpts)
const [email,           emailAttrs]           = defineField('email',           fieldOpts)
const [phone,           phoneAttrs]           = defineField('phone',           fieldOpts)
const [password,        passwordAttrs]        = defineField('password',        fieldOpts)
const [confirmPassword, confirmPasswordAttrs] = defineField('confirmPassword', fieldOpts)

// track which fields the user has interacted with (for green valid border)
const touched = reactive({
  firstName: false, lastName: false, email: false,
  phone: false, password: false, confirmPassword: false,
})

const onSubmit = handleSubmit(async (values) => {
  const ok = await authStore.register(values.email, values.password, values.firstName, values.lastName, values.phone)
  if (ok) router.push('/login')
})
</script>

<template>
  <div class="card">
    <button class="back-btn" @click="router.back()">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 12H5M12 5l-7 7 7 7"/>
      </svg>
    </button>
    <div class="header">
      <h1 class="title">Crea tu cuenta</h1>
      <p class="subtitle">Regístrate para encontrar estacionamiento</p>
    </div>

    <form class="form" @submit.prevent="onSubmit" novalidate>
      <div class="row-two">
        <div class="field">
          <label class="label">Nombre</label>
          <input
            v-model="firstName"
            v-bind="firstNameAttrs"
            type="text"
            class="input"
            :class="{
              'input--error': errors.firstName,
              'input--valid': touched.firstName && !errors.firstName,
            }"
            autocomplete="given-name"
            @blur="touched.firstName = true"
          />
          <Transition name="field-msg">
            <span v-if="errors.firstName" class="field-error">{{ errors.firstName }}</span>
          </Transition>
        </div>
        <div class="field">
          <label class="label">Apellido</label>
          <input
            v-model="lastName"
            v-bind="lastNameAttrs"
            type="text"
            class="input"
            :class="{
              'input--error': errors.lastName,
              'input--valid': touched.lastName && !errors.lastName,
            }"
            autocomplete="family-name"
            @blur="touched.lastName = true"
          />
          <Transition name="field-msg">
            <span v-if="errors.lastName" class="field-error">{{ errors.lastName }}</span>
          </Transition>
        </div>
      </div>

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
        <label class="label">Teléfono</label>
        <input
          v-model="phone"
          v-bind="phoneAttrs"
          type="tel"
          class="input"
          :class="{
            'input--error': errors.phone,
            'input--valid': touched.phone && !errors.phone,
          }"
          autocomplete="tel"
          @blur="touched.phone = true"
        />
        <Transition name="field-msg">
          <span v-if="errors.phone" class="field-error">{{ errors.phone }}</span>
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
          autocomplete="new-password"
          @blur="touched.password = true"
        />
        <Transition name="field-msg">
          <span v-if="errors.password" class="field-error">{{ errors.password }}</span>
          <span v-else-if="!touched.password" class="hint">Mínimo 8 caracteres</span>
        </Transition>
      </div>

      <div class="field">
        <label class="label">Confirmar contraseña</label>
        <input
          v-model="confirmPassword"
          v-bind="confirmPasswordAttrs"
          type="password"
          class="input"
          :class="{
            'input--error': errors.confirmPassword,
            'input--valid': touched.confirmPassword && !errors.confirmPassword,
          }"
          autocomplete="new-password"
          @blur="touched.confirmPassword = true"
        />
        <Transition name="field-msg">
          <span v-if="errors.confirmPassword" class="field-error">{{ errors.confirmPassword }}</span>
        </Transition>
      </div>

      <Transition name="field-msg">
        <p v-if="authStore.registerError" class="error-msg">{{ authStore.registerError }}</p>
      </Transition>

      <button class="btn-primary" type="submit" :disabled="authStore.registerLoading">
        <span v-if="authStore.registerLoading" class="btn-spinner-wrap">
          <svg class="spinner" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="31.4" stroke-dashoffset="10"/>
          </svg>
          Creando cuenta...
        </span>
        <span v-else>Crear cuenta</span>
      </button>
    </form>

    <p class="terms-text">
      Al registrarte aceptas nuestros
      <a href="#" class="link-primary link-underline">Términos de uso</a>
    </p>
  </div>
</template>

<style scoped>
.card {
  background: rgba(255, 255, 255, 0.97);
  border-radius: 20px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.35), 0 1px 0 rgba(255, 255, 255, 0.08) inset;
  width: 400px;
  padding: 28px 32px 24px;
  position: relative;
  backdrop-filter: blur(12px);
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
  margin-bottom: 16px;
}

.row-two {
  display: flex;
  gap: 16px;
}

.row-two .field {
  flex: 1;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 3px;
  /* reserve minimum height to avoid layout jumps on error appear/disappear */
  min-height: 64px;
}

.label {
  font-size: 12px;
  font-weight: 500;
  color: #333;
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
  margin-top: 1px;
}

.hint {
  font-size: 11px;
  color: #888;
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

.terms-text {
  font-size: 12px;
  color: #888;
  text-align: center;
}

.link-primary {
  color: #f2894a;
  text-decoration: none;
}

.link-underline {
  text-decoration: underline;
}
</style>
