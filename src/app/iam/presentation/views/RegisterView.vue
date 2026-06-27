<script setup lang="ts">
import { reactive, ref } from 'vue'
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
const showPwd     = ref(false)
const showConfirm = ref(false)

const onSubmit = handleSubmit(async (values) => {
  const ok = await authStore.register(values.email, values.password, values.firstName, values.lastName, values.phone)
  if (ok) router.push('/dashboard')
})
</script>

<template>
  <div class="auth-card">
    <button class="auth-back" @click="router.back()" aria-label="Volver">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 12H5M12 5l-7 7 7 7"/>
      </svg>
    </button>

    <p class="auth-eyebrow">Crea tu cuenta</p>
    <h1 class="auth-title">Empieza a aparcar mejor</h1>
    <p class="auth-sub">Regístrate para encontrar espacios libres en tiempo real cerca de ti.</p>

    <form class="auth-form" @submit.prevent="onSubmit" novalidate>
      <div class="auth-row-two">
        <div class="auth-field">
          <label class="auth-label">Nombre</label>
          <div class="auth-input-wrap">
            <input
              v-model="firstName"
              v-bind="firstNameAttrs"
              type="text"
              class="auth-input"
              :class="{ 'auth-input--error': errors.firstName, 'auth-input--valid': touched.firstName && !errors.firstName }"
              autocomplete="given-name"
              @blur="touched.firstName = true"
            />
          </div>
          <Transition name="auth-msg">
            <span v-if="errors.firstName" class="auth-field-error">{{ errors.firstName }}</span>
          </Transition>
        </div>
        <div class="auth-field">
          <label class="auth-label">Apellido</label>
          <div class="auth-input-wrap">
            <input
              v-model="lastName"
              v-bind="lastNameAttrs"
              type="text"
              class="auth-input"
              :class="{ 'auth-input--error': errors.lastName, 'auth-input--valid': touched.lastName && !errors.lastName }"
              autocomplete="family-name"
              @blur="touched.lastName = true"
            />
          </div>
          <Transition name="auth-msg">
            <span v-if="errors.lastName" class="auth-field-error">{{ errors.lastName }}</span>
          </Transition>
        </div>
      </div>

      <div class="auth-field">
        <label class="auth-label">Correo electrónico</label>
        <div class="auth-input-wrap">
          <input
            v-model="email"
            v-bind="emailAttrs"
            type="email"
            class="auth-input"
            :class="{ 'auth-input--error': errors.email, 'auth-input--valid': touched.email && !errors.email }"
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
        <label class="auth-label">Teléfono</label>
        <div class="auth-input-wrap">
          <input
            v-model="phone"
            v-bind="phoneAttrs"
            type="tel"
            class="auth-input"
            :class="{ 'auth-input--error': errors.phone, 'auth-input--valid': touched.phone && !errors.phone }"
            autocomplete="tel"
            placeholder="987 654 321"
            @blur="touched.phone = true"
          />
        </div>
        <Transition name="auth-msg">
          <span v-if="errors.phone" class="auth-field-error">{{ errors.phone }}</span>
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
            :class="{ 'auth-input--error': errors.password, 'auth-input--valid': touched.password && !errors.password }"
            autocomplete="new-password"
            placeholder="••••••••"
            @blur="touched.password = true"
          />
          <button type="button" class="auth-eye" :aria-label="showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="showPwd = !showPwd">
            <svg v-if="showPwd" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <Transition name="auth-msg">
          <span v-if="errors.password" class="auth-field-error">{{ errors.password }}</span>
          <span v-else-if="!touched.password" class="auth-field-hint">Mínimo 8 caracteres</span>
        </Transition>
      </div>

      <div class="auth-field">
        <label class="auth-label">Confirmar contraseña</label>
        <div class="auth-input-wrap">
          <input
            v-model="confirmPassword"
            v-bind="confirmPasswordAttrs"
            :type="showConfirm ? 'text' : 'password'"
            class="auth-input auth-input--pwd"
            :class="{ 'auth-input--error': errors.confirmPassword, 'auth-input--valid': touched.confirmPassword && !errors.confirmPassword }"
            autocomplete="new-password"
            placeholder="••••••••"
            @blur="touched.confirmPassword = true"
          />
          <button type="button" class="auth-eye" :aria-label="showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="showConfirm = !showConfirm">
            <svg v-if="showConfirm" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <Transition name="auth-msg">
          <span v-if="errors.confirmPassword" class="auth-field-error">{{ errors.confirmPassword }}</span>
        </Transition>
      </div>

      <Transition name="auth-msg">
        <p v-if="authStore.registerError" class="auth-alert">{{ authStore.registerError }}</p>
      </Transition>

      <button class="auth-btn" type="submit" :disabled="authStore.registerLoading">
        <template v-if="authStore.registerLoading">
          <svg class="auth-spinner" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="31.4" stroke-dashoffset="10"/>
          </svg>
          Creando cuenta...
        </template>
        <template v-else>Crear cuenta</template>
      </button>
    </form>

    <p class="auth-alt">
      Al registrarte aceptas nuestros
      <a href="#" class="auth-link">Términos de uso</a>
    </p>
  </div>
</template>
